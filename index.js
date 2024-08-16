const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const {dot} = require('./tools')
const app = express();
const PORT = 5000;

app.use(express.json());
require('dotenv').config();
app.get("/", (req, res) => {
    res.send("hello");
});

const sentEmails = new Set(); // Set to store sent email unique IDs

app.post('/webhook', async (req, res) => {
    const UserInputs = Object.entries(req.body).filter(([key, value]) => key.startsWith('devlly'));
    const data = Object.fromEntries(UserInputs);
    const submissionId = req.body.__submission.id; // Use the submission ID from the request

    // Check if the email for this submission ID has already been sent
    if (sentEmails.has(submissionId)) {
        return res.status(400).send({ status: 'error', message: 'Email has already been sent for this submission ID.' });
    }

    // Generate HTML content based on user inputs
    const htmlContent = generateHTML(req.body, submissionId);

    // Generate PDF from HTML content
    const pdfPath = await generatePDF(htmlContent, 'invoice.pdf');

    // Check if devlly_isMeet is set and adjust email content accordingly
    const emailTemplate = data['devlly_isMeet'] ? 'Votre réservation de réunion est confirmée : Rejoignez-nous via le lien Meet' : 'Urgent: Votre devis est prêt, venez le consulter dès maintenant!';
    const emailText = data['devlly_isMeet']
        ? 'Please find attached your invoice. You can join the Google Meet using the link provided.'
        : 'Please find attached your invoice.';

    // Send the email
    await sendEmail(data['devlly_email'], emailTemplate, emailText, pdfPath, data['devlly_isMeet'], submissionId , data['devlly_meet_date']);

    // Add the unique ID to the sentEmails set
    sentEmails.add(submissionId);

    console.log(req.body);
    res.status(200).send({ status: 'success' });
});
app.post('/webhook-ar', async (req, res) => {
    const UserInputs = Object.entries(req.body).filter(([key, value]) => key.startsWith('devlly'));
    const data = Object.fromEntries(UserInputs);
    const submissionId = req.body.__submission.id; // Use the submission ID from the request

    // Check if the email for this submission ID has already been sent
    if (sentEmails.has(submissionId)) {
        return res.status(400).send({ status: 'error', message: 'Email has already been sent for this submission ID.' });
    }

    // Generate HTML content based on user inputs
    const htmlContent = generateHTML_ar(req.body, submissionId);

    // Generate PDF from HTML content
    const pdfPath = await generatePDF(htmlContent, 'invoice.pdf');

    // Check if devlly_isMeet is set and adjust email content accordingly
    const emailTemplate = data['devlly_isMeet'] ? 'Votre réservation de réunion est confirmée : Rejoignez-nous via le lien Meet' : 'Urgent: Votre devis est prêt, venez le consulter dès maintenant!';
    const emailText = data['devlly_isMeet']
        ? 'Please find attached your invoice. You can join the Google Meet using the link provided.'
        : 'Please find attached your invoice.';

    // Send the email
    await sendEmail(data['devlly_email'], emailTemplate, emailText, pdfPath, data['devlly_isMeet'], submissionId , data['devlly_meet_date']);

    // Add the unique ID to the sentEmails set
    sentEmails.add(submissionId);

    console.log(req.body);
    res.status(200).send({ status: 'success' });
});
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});

function generateHTML(data , submissionId) {
    console.log(data)
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    html = html.replace('{{full name}}', data['devlly_fullname']);
    html = html.replace('{{E-mail}}', data['devlly_email']);
    html = html.replace('{{Telephone}}', data['devlly_phone']);
    html = html.replace('{{date}}', moment().format('DD-MM-YYYY'));
    html = html.replace('{{id_devis}}', submissionId);
    let tableData = [];

    switch(data['devlly_website_type']) {
        case "ecommerce":
            if(data["devlly_isGros"] === "Vente en gros")
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 100000 });
            else if(data["devlly_isGros"] === "Vente au détail")
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 60000 });
            else 
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 120000 });
            break;

        case "Site éducatif (LMS)":
            switch(data["devlly_lms_type_courses"]) {
                case "Présentiel":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - Présentiel", quantity: 1, price: 50000 });
                    break;
                case "En ligne":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - En ligne", quantity: 1, price: 160000 });
                    break;
                case "Les deux":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - Présentiel + En ligne", quantity: 1, price: 200000 });
                    break;
                default:
                    tableData.push({ description: "Développement de Site Éducatif (LMS)", quantity: 1, price: 100000 });
                    break;
            }
            break;

        case "Landing page":
            tableData.push({ description: "Landing Page Development", quantity: 1, price: 10000 });
            break;

        case "Portfolio":
            tableData.push({ description: "Portfolio Website Development", quantity: 1, price: 30000 });
            break;

        case "Blog":
            tableData.push({ description: "Blog Website Development", quantity: 1, price: 60000 });
            break;

        case "Site pour business":
                switch(data["devlly_buisness_type"]) {
                    case "Agence de voyage":
                        let travelAgencyPrice = 0;
                        switch (data["devlly_voyage_systeme_res"]) {
                            case "Système de commande simple: Le client remplit manuellement les informations de contact et de réservation, et reçoit le devis manuel.":
                                travelAgencyPrice = 80000;
                                break;
                            case "Système de prix dynamique : Les prix sont affichés dynamiquement en fonction du nombre de personnes et des dates. La réservation se fait manuellement, mais le devis est généré":
                                travelAgencyPrice = 120000;
                                break;
                            default:
                                travelAgencyPrice = 0; // Default value if the system is not specified
                        }
            
                        tableData.push({
                            description: "Développement de Site pour Agence de voyage",
                            quantity: 1,
                            price: travelAgencyPrice
                        });
                        break;
            
                    case "Agence immobilière":
                        if (data["devlly_immob_type"] === "site web uniquement vitrine") {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière (Vitrine)",
                                quantity: 1,
                                price: 80000
                            });
                        } else if (data["devlly_immob_type"] === "Avec un système de gestion immobilière") {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière (Système de gestion)",
                                quantity: 1,
                                price: 180000
                            });
                        } else {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière",
                                quantity: 1,
                                price: 50000
                            });
                        }
                        break;
            
                    default:
                        tableData.push({
                            description: "Développement de Site pour Business",
                            quantity: 1,
                            price: 80000
                        });
                        break;
                }
                break;
            
            default:
                 
                break;
            
    }





    // Define extra services with their prices
    const extraServices = [
        { name: "Payement en ligne par Edahabia/CIB ( 20.000 DA)", description: "Edahabia/CIB", price: 20000 },
        { name: "Payement en ligne par Visa/ MasterCard /PayPal (30,000 DA)", description: "Visa/MasterCard/PayPal", price: 30000 },
        { name: "Multilingue (5,000 DA per langue)", 
          description: data["devlly_services_extra_languages"] && data["devlly_services_extra_languages"].length > 0
              ? `Site multilingue (${data["devlly_services_extra_languages"].length} langues)`
              : "Site multilingue (Aucune langue spécifiée)", 
          price: data["devlly_services_extra_languages"] && data["devlly_services_extra_languages"].length > 0
              ? 5000 * data["devlly_services_extra_languages"].length
              : 0 
        },
        { name: "blog (15,000 DA)", description: "Intégration d'un blog", price: 15000 },
        { name: "optimisation SEO avancée (20,000 DA)", description: "SEO avancée", price: 20000 },
        { name: "Intégration des sociétés de livraison (8,000 DA per société )", description: "Intégration de livraison", price: 8000 },
        {
            name: "Intégration pixel (3,000 DA per platform)",
            description: data["devlly_pixel"] && data["devlly_pixel"].length > 0 
                ? `Intégration de pixels ${data["devlly_pixel"].join(', ')}` 
                : "Intégration de pixels (Aucune plateforme spécifiée)",
            price: data["devlly_pixel"] && data["devlly_pixel"].length > 0 
                ? 3000 * data["devlly_pixel"].length 
                : 3000
        },
        {
            name: "Design des landing pages (2,000 DA per landing page)",
            description: `Design des landing pages (${data["devlly_landingpage_num_1"] || 1})`,
            price: data["devlly_landingpage_num_1"] 
                ? 2000 * data["devlly_landingpage_num_1"]
                : 2000
        },
        { name: "intégrations spécifiques avec des outils existants ( pour négocier)", description: "Intégrations de outils existants", price: 0 }
    ];
    
    // Check and add selected extra services
    if (data["devlly_services_extra"]) {
        let extraServicesNames = [];
        let totalExtraServicesPrice = 0;
    
        data["devlly_services_extra"].forEach(service => {
            const selectedService = extraServices.find(extra => extra.name === service);
    
            if (selectedService) {
                // Add the selected service's name to the list
                extraServicesNames.push(selectedService.description);
                // Add the selected service's price to the total
                totalExtraServicesPrice += selectedService.price;
            }
        });
    
        if (extraServicesNames.length > 0) {
            const description = `Services supplémentaires (${extraServicesNames.join(', ')})`;
            tableData.push({ description: description, quantity: 1, price: totalExtraServicesPrice });
        }
    }
    


    // Add other standard services
    tableData.push({ description: "Optimisation SEO basic", quantity: 1, price: "Gratuite" });
    tableData.push({ description: "Maintenance et Support (1 an)", quantity: 1, price: "Gratuite" });
    tableData.push({ description: "Hébergement et Nom de Domaine (1 an)", quantity: 1, price: "Gratuite" });

    // Calculate the total price (only sum numeric values)
    let totalPrice = tableData.reduce((total, item) => {
        return typeof item.price === 'number' ? total + item.price : total;
    }, 0);
    totalPrice = dot(totalPrice) + " DA";

    let dataTable = "<tbody>";
    tableData.forEach((item, index) => {
        const highlightClass = (index % 2 === 1) ? "class='highlight'" : "";
        dataTable += `
            <tr ${highlightClass}>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${typeof item.price === 'number' ? dot(item.price) + " DA" : item.price}</td>
            </tr>
        `;
    });
    dataTable += `</tbody>
    <tfoot>
    <tr>
        <td colspan="2">TOTALE</td>
        <td class="price-column">${totalPrice}</td>
    </tr>
    </tfoot>`;

    html = html.replace('{{datatable}}', dataTable);
    return html;
}
function generateHTML_ar(data , submissionId) {
    console.log(data)
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    html = html.replace('{{full name}}', data['devlly_fullname']);
    html = html.replace('{{E-mail}}', data['devlly_email']);
    html = html.replace('{{Telephone}}', data['devlly_phone']);
    html = html.replace('{{date}}', moment().format('DD-MM-YYYY'));
    html = html.replace('{{id_devis}}', submissionId);
    let tableData = [];

    switch(data['devlly_website_type']) {
        case "التجارة الإلكترونية":
            if(data["devlly_isGros"] === "البيع بالجملة")
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 100000 });
            else if(data["devlly_isGros"] === "البيع بالتجزئة")
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 60000 });
            else 
                tableData.push({ description: "E-commerce Website Development", quantity: 1, price: 120000 });
            break;

        case "الموقع التعليمي (LMS)":
            switch(data["devlly_lms_type_courses"]) {
                case "حضوري":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - Présentiel", quantity: 1, price: 50000 });
                    break;
                case "عبر الإنترنت":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - En ligne", quantity: 1, price: 160000 });
                    break;
                case "كلاهما":
                    tableData.push({ description: "Développement de Site Éducatif (LMS) - Présentiel + En ligne", quantity: 1, price: 200000 });
                    break;
                default:
                    tableData.push({ description: "Développement de Site Éducatif (LMS)", quantity: 1, price: 100000 });
                    break;
            }
            break;

        case "صفحة هبوط":
            tableData.push({ description: "Landing Page Development", quantity: 1, price: 10000 });
            break;

        case "Portfolio":
            tableData.push({ description: "Portfolio Website Development", quantity: 1, price: 30000 });
            break;

        case "مدونة":
            tableData.push({ description: "Blog Website Development", quantity: 1, price: 60000 });
            break;

        case "موقع لمشروع":
                switch(data["devlly_buisness_type"]) {
                    case "وكالة سفر":
                        let travelAgencyPrice = 0;
                        switch (data["devlly_voyage_systeme_res"]) {
                            case "Système de commande simple: Le client remplit manuellement les informations de contact et de réservation, et reçoit le devis manuel.":
                                travelAgencyPrice = 80000;
                                break;
                            case "Système de prix dynamique : Les prix sont affichés dynamiquement en fonction du nombre de personnes et des dates. La réservation se fait manuellement, mais le devis est généré":
                                travelAgencyPrice = 120000;
                                break;
                            default:
                                travelAgencyPrice = 0; // Default value if the system is not specified
                        }
            
                        tableData.push({
                            description: "Développement de Site pour Agence de voyage",
                            quantity: 1,
                            price: travelAgencyPrice
                        });
                        break;
            
                    case "وكالة عقارية":
                        if (data["devlly_immob_type"] === "موقع إلكتروني عرضي فقط") {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière (Vitrine)",
                                quantity: 1,
                                price: 80000
                            });
                        } else if (data["devlly_immob_type"] === "مع نظام إدارة عقارية") {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière (Système de gestion)",
                                quantity: 1,
                                price: 180000
                            });
                        } else {
                            tableData.push({
                                description: "Développement de Site pour Agence immobilière",
                                quantity: 1,
                                price: 50000
                            });
                        }
                        break;
            
                    default:
                        tableData.push({
                            description: "Développement de Site pour Business",
                            quantity: 1,
                            price: 80000
                        });
                        break;
                }
                break;
            
            default:
                 
                break;
            
    }





    // Define extra services with their prices
    const extraServices = [
        { name: "الدفع عبر الإنترنت بواسطة Edahabia/CIB (20,000 دج)", description: "Edahabia/CIB", price: 20000 },
        { name: "الدفع عبر الإنترنت بواسطة فيزا/ماستركارد/بايبال (30,000 دج)", description: "Visa/MasterCard/PayPal", price: 30000 },
        { name: "متعدد اللغات (5,000 دج لكل لغة)", description: "Site multilingue", price: 5000 },
        { name: "مدونة (15,000 دج)", description: "Intégration d'un blog", price: 15000 },
        { name: "تحسين SEO متقدم (20,000 دج)", description: "SEO avancée", price: 20000 },
        { name: "إدماج شركات التوصيل (8000 دج لكل شركة)", description: "Intégration de livraison", price: 8000 },
        {
            name: "إدماج بكسل (3,000 دج لكل منصة)",
            description: data["devlly_pixel"] && data["devlly_pixel"].length > 0 
                ? `Intégration de pixels ${data["devlly_pixel"].join(', ')}` 
                : "Intégration de pixels (Aucune plateforme spécifiée)",
            price: data["devlly_pixel"] && data["devlly_pixel"].length > 0 
                ? 3000 * data["devlly_pixel"].length 
                : 3000
        },
        {
            name: "تصميم صفحات الهبوط (2,000 دج لكل صفحة هبوط)",
            description: `Design des landing pages (${data["devlly_landingpage_num_1"] || 1})`,
            price: data["devlly_landingpage_num_1"] 
                ? 2000 * data["devlly_landingpage_num_1"]
                : 2000
        },
        { name: "تكاملات محددة مع الأدوات الموجودة (للتفاوض)", description: "Intégrations de outils existants", price: 0 }
    ];

    // Check and add selected extra services
    if (data["devlly_services_extra"]) {
        let extraServicesNames = [];
        let totalExtraServicesPrice = 0;

        data["devlly_services_extra"].forEach(service => {
            const selectedService = extraServices.find(extra => extra.name === service);
            if (selectedService) {
                extraServicesNames.push(selectedService.description);
                totalExtraServicesPrice += selectedService.price;
            }
        });

        if (extraServicesNames.length > 0) {
            const description = `Extra services (${extraServicesNames.join(', ')})`;
            tableData.push({ description: description, quantity: 1, price: totalExtraServicesPrice });
        }
    }



    // Add other standard services
    tableData.push({ description: "Optimisation SEO basic", quantity: 1, price: "Gratuite" });
    tableData.push({ description: "Maintenance et Support (1 an)", quantity: 1, price: "Gratuite" });
    tableData.push({ description: "Hébergement et Nom de Domaine (1 an)", quantity: 1, price: "Gratuite" });

    // Calculate the total price (only sum numeric values)
    let totalPrice = tableData.reduce((total, item) => {
        return typeof item.price === 'number' ? total + item.price : total;
    }, 0);
    totalPrice = dot(totalPrice) + " DA";

    let dataTable = "<tbody>";
    tableData.forEach((item, index) => {
        const highlightClass = (index % 2 === 1) ? "class='highlight'" : "";
        dataTable += `
            <tr ${highlightClass}>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${typeof item.price === 'number' ? dot(item.price) + " DA" : item.price}</td>
            </tr>
        `;
    });
    dataTable += `</tbody>
    <tfoot>
    <tr>
        <td colspan="2">TOTALE</td>
        <td class="price-column">${totalPrice}</td>
    </tr>
    </tfoot>`;

    html = html.replace('{{datatable}}', dataTable);
    return html;
}

async function generatePDF(htmlContent, filename) {
   const browser = await puppeteer.launch();
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filename, format: 'A4', printBackground: true });
    await browser.close();
    return filename;
}


const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Email configuration
const senderEmail = 'noreply@devlly.net'; // Your Titan email address
const senderPassword = 'Devlly00@'; // Your Titan password

    async function sendEmail(to, subject, text, pdfPath, isMeet, submissionId , date) {
        let transporter = nodemailer.createTransport({
            host: 'smtp.titan.email',
            port: 587, // Use 465 for SSL if you want to set secure: true
            secure: false, // Set to true if using port 465
            auth: {
                user: senderEmail,
                pass: senderPassword,
            },
        });

        let mailOptions;
        console.log("ismeet = ", isMeet);
        if (isMeet === 'OK') {
            // Schedule the meeting for the next day at 4 PM
            const meetingDate = moment(date, 'YYYY-MM-DD');

            mailOptions = {
                from: '"Devlly Agency" <' + senderEmail + '>',
                to: to,
                subject: subject,
                html: `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #ddd;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 10px;
                            background-color: #f9f9f9;
                        }
                        h1 {
                            color: #16217C;
                        }
                        .logo {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .logo img {
                            max-width: 150px;
                        }
                        .button {
                            display: inline-block;
                            padding: 10px 20px;
                            font-size: 16px;
                            color: white;
                            background-color: #16217C;
                            border-radius: 5px;
                            text-decoration: none;
                            margin-top: 20px;
                        }
                        .button:hover {
                            background-color: #0056b3;
                            color: white;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">
                            <img src="https://i.imgur.com/KHUlNrv.png" alt="Devlly Agency Logo" width="150">
                        </div>
                        <h1>Your vision, our Code!</h1>
                        <p>Bonjour,</p>
                        <p>Merci d'avoir contacté Devlly Agency pour vos besoins en développement. Nous sommes ravis de vous présenter votre devis personnalisé en pièce jointe, ainsi que notre contrat de services.</p>
                        <p>Nous avons également prévu une réunion pour discuter davantage de vos besoins. Rejoignez la réunion en utilisant le lien ci-dessous :</p>
                        <p><strong>Date et Heure:</strong> ${meetingDate.format('DD-MM-YYYY à HH:mm')}</p>
                        <a href="https://meet.google.com/uit-bvdy-zya" class="button">Rejoindre la réunion</a>
                        <p>Si vous avez des questions ou des besoins supplémentaires, n'hésitez pas à nous contacter. Nous sommes là pour vous aider.</p>
                        <p>Cordialement,<br>L'équipe Devlly Agency</p>
                    </div>
                </body>
                </html>
                `,
            };
        console.log("we sent a meeting email");
    } else {
        const paymentLink = `https://devlly.net/?fluent-form=4&submission_id=${submissionId}&email=${encodeURIComponent(to)}`;

        mailOptions = {
            from: '"Devlly Agency" <' + senderEmail + '>',
            to: to,
            subject: subject,
            html: `
    <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #ddd;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 10px;
            background-color: #f9f9f9;
            box-sizing: border-box;
        }
        h1 {
            color: #16217C;
            font-size: 24px;
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo img {
            width: 200px;
            max-width: 100%;
            height: auto;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: white;
            background-color: #16217C;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 20px;
        }
        .button:hover {
            background-color: #0056b3;
            color: white;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            color: #555;
            background-color: #f8f9fa;
            padding: 20px;
            box-sizing: border-box;
        }
        .social-icons {
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
            text-align:center;
            flex-wrap: wrap;
        }
        .social-icons a {
            display: inline-block;
            margin: 0 10px;
            text-decoration: none;
        }
        .social-icons img {
            display: block;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            /* background-color: #16217C; */
        }
        .contact-info {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .contact-info a {
            text-decoration: none;
            color: #007bff;
        }
        .contact-info a:hover {
            text-decoration: underline;
        }
        .unsubscribe {
            font-size: 10px;
        }
        .unsubscribe a {
            text-decoration: none;
            color: #dc3545;
        }
        .unsubscribe a:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            .container {
                padding: 10px;
            }
            .button {
                font-size: 14px;
                padding: 8px 16px;
            }
            .social-icons img {
                width: 30px;
                height: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="https://devlly.net">
        <div class="logo">
            <img src="https://i.imgur.com/KHUlNrv.png" alt="Devlly Agency Logo">
        </div>
        </a>
        <h1>Your vision, our Code!</h1>
        <p>Bonjour,</p>
        <p>Merci d'avoir contacté Devlly Agency pour vos besoins en développement. Nous sommes ravis de vous présenter votre devis personnalisé en pièce jointe, ainsi que notre contrat de services.</p>
        <p>Pour faciliter le processus, nous avons également inclus un lien où vous pouvez procéder au paiement directement si vous acceptez notre offre et les détails du contrat :</p>
        <a href="${paymentLink}" class="button">Procéder au paiement</a>
        <p>Si vous avez des questions ou des besoins supplémentaires, n'hésitez pas à nous contacter. Nous sommes là pour vous aider.</p>
        <p>Cordialement,<br>L'équipe Devlly Agency</p>
        
        <div class="footer">
            <div class="social-icons">
                <a href="tel:0540323994" title="Call us">
                    <img src="https://i.imgur.com/bTVhW9f.png" alt="Call us">
                </a>
                <a href="https://x.com/devlly__" target="_blank" title="Twitter">
                    <img src="https://i.imgur.com/YJkxjBP.png" alt="Twitter">
                </a>
                <a href="https://www.facebook.com/devlly__" target="_blank" title="Facebook">
                    <img src="https://i.imgur.com/1AaVjBs.png" alt="Facebook">
                </a>
                <a href="https://www.instagram.com/devlly__/" target="_blank" title="Instagram">
                    <img src="https://i.imgur.com/ZaKpWTs.png" alt="Instagram">
                </a>
                 <a href="https://www.linkedin.com/company/devlly/" target="_blank" title="Instagram">
                    <img src="https://i.imgur.com/6I6Iu4D.png" alt="Instagram">
                </a>
            </div>
            <div class="contact-info">
                <a href="mailto:contact@devlly.net" style="color: #16217C;" title="Email us">
                    contact@devlly.net
                </a>
            </div>
            <div class="unsubscribe">
                <a href="#" class="">Se désinscrire</a>
            </div>
        </div>
    </div>
</body>
</html>



            `,
            attachments: [
                {
                    filename: "Votre Devis.pdf",
                    path: pdfPath,
                },
                {
                    filename: "contract de travail.pdf",
                    path: "./contract de travail.pdf",
                },
            ],
        };
    }

    try {
        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully.');
        console.log('Info object:', info);

        // Append the sent email to the "Sent" folder using IMAP
        const imap = new Imap({
            user: senderEmail,
            password: senderPassword,
            host: 'imap.titan.email',
            port: 993,
            tls: true,
        });

        imap.once('ready', () => {
            imap.openBox('Sent', true, (err) => {
                if (err) {
                    console.error('Error opening "Sent" folder:', err);
                    imap.end();
                    return;
                }

                // Create the email message as MIMEText
                const emailMessage = `From: ${senderEmail}\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${text}`;

                // Append the sent email to the "Sent" folder
                imap.append(emailMessage, { mailbox: 'Sent' }, (appendErr) => {
                    if (appendErr) {
                        console.error('Error appending email to "Sent" folder:', appendErr);
                    } else {
                        console.log('Email appended to "Sent" folder.');
                    }
                    imap.end();
                });
            });
        });

        imap.once('error', (imapErr) => {
            console.error('IMAP Error:', imapErr);
        });

        imap.connect();
    } catch (error) {
        console.error('Error sending email:', error);
    }
}