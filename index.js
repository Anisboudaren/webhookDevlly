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
                                travelAgencyPrice = 120000; // Default value if the system is not specified
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
                            case "نظام طلب بسيط: يملأ العميل يدويًا معلومات الاتصال والحجز، ويتلقى عرض الأسعار يدويًا.":
                                travelAgencyPrice = 80000;
                                break;
                            case "نظام تسعير ديناميكي: تُعرض الأسعار بشكل ديناميكي بناءً على عدد الأشخاص والتواريخ. يتم إجراء الحجز يدويًا، ولكن يتم توليد عرض الأسعار تلقائيًا.":
                                travelAgencyPrice = 120000;
                                break;
                            default:
                                travelAgencyPrice = 120001; // Default value if the system is not specified
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
   const browser = await puppeteer.launch({
    headless: true, 
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ]
    }
);
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filename, format: 'A4', printBackground: true });
    await browser.close();
    return filename;
}

const Imap = require('imap');
const senderEmail = 'noreply@devlly.net'; 
const senderPassword = 'Devlly00@'; 

async function sendEmail(to, subject, text, pdfPath, isMeet, submissionId, date) {
    const meetingDate = date;
    const meetHTML = `
                        <div id=":p3" class="ii gt"
jslog="20277; u014N:xr6bB; 1:WyIjdGhyZWFkLWY6MTgwNzU4OTY2MTk3NDgxNTY5OSJd; 4:WyIjbXNnLWY6MTgwNzU5MzM3MjQxNDI3OTU1OSIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLDBd">
<div id=":p2" class="a3s aiL msg-5387884785609020660 adM">
<div class="HOEnZb">
  <div class="adm">
    <div id="q_4" class="ajR h4" data-tooltip="Masquer le contenu développé"
      aria-label="Masquer le contenu développé" aria-expanded="true">
      <div class="ajT"></div>
    </div>
  </div>
  <div class="im"><u></u>
    <div
      style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f9f9f9;margin:0;padding:0">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody>
          <tr>
            <td>
              <div class="m_-5387884785609020660container"
                style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:10px;background-color:#ffffff;box-sizing:border-box">
                <a href="https://devlly.net" target="_blank"
                  data-saferedirecturl="https://www.google.com/url?q=https://devlly.net&amp;source=gmail&amp;ust=1723942146285000&amp;usg=AOvVaw3xNc1XysHTxCDvDbZthuc9">
                  <div style="text-align:center;margin-bottom:20px">
                    <img src="https://ci3.googleusercontent.com/meips/ADKq_NbyCwvOwsO9LYPLupNwWzZadrySm8Jpj_sbyw6MWQH4VKDletHagpIluJVhQmeDS22_r2p1=s0-d-e1-ft#https://i.imgur.com/KHUlNrv.png" alt="Devlly Agency Logo" style="width:200px;max-width:100%;height:auto" width="200" height="auto" class="CToWUd" data-bit="iit">
                  </div>
                </a>
                <h1 style="color:#16217c;font-size:24px;text-align:center">Your vision, our Code!</h1>
                <p>Bonjour,</p>
                    <p>Merci d'avoir contacté Devlly Agency pour vos besoins en développement. Nous sommes ravis de vous présenter votre devis personnalisé en pièce jointe, ainsi que notre contrat de services.</p>
                    <p>Nous avons également prévu une réunion pour discuter davantage de vos besoins. Rejoignez la réunion en utilisant le lien ci-dessous :</p>
                    <p><strong>Date et Heure:</strong> ${meetingDate}</p>
                    <a href='https://meet.google.com/uit-bvdy-zya' class="m_-5387884785609020660button"
                    style="display:block;width:100%;padding:10px 20px;font-size:16px;color:white;background-color:#16217c;border-radius:20px;text-decoration:none;margin-top:20px;text-align:center;box-sizing:border-box">Rejoindre la réunion</a>
                    <p>Si vous avez des questions ou des besoins supplémentaires, n'hésitez pas à nous contacter. Nous sommes là pour vous aider.</p>
                    <p>Cordialement,<br>L'équipe Devlly Agency</p>
                <div
                  style="margin-top:30px;text-align:center;border-top:1px solid #ddd;padding-top:15px;color:#555;background-color:#f8f9fa;padding:20px;box-sizing:border-box">
                  <div class="m_-5387884785609020660social-icons"
                    style="margin-bottom:20px;display:flex;justify-content:center;text-align:center">
                    <a href="https://www.facebook.com/profile.php?id=61553758615638&amp;locale=fr_FR"
                      title="Facebook"
                      style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                      target="_blank"
                      data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/profile.php?id%3D61553758615638%26locale%3Dfr_FR&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw24B9IdlRbTZOjTQJwP8AWe">
                      <img src="https://ci3.googleusercontent.com/meips/ADKq_NYSTMLpBvDH97naOwn6YFuvBduRGkYOr6Ppm4EGE5mNJqcsbxHMJmGAswf1TD2v8SwgnHMIXlXHjhUw2gGwuA=s0-d-e1-ft#https://i.postimg.cc/xjFShQFM/image-2.png" alt="Facebook" title="Facebook" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                    </a>
                    <a href="https://www.instagram.com/devlly__/" title="Instagram"
                      style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                      target="_blank"
                      data-saferedirecturl="https://www.google.com/url?q=https://www.instagram.com/devlly__/&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw3lnKZw_2TP5XbO5W562d32">
                      <img src="https://ci3.googleusercontent.com/meips/ADKq_Nbkb6kIifAsx57bQGo_H_CDP9aTHdoYprluDn75zs8RbWZYqJX0U1mppjM87Gana3IhhcvsBOyQAKMeBfV3Eg=s0-d-e1-ft#https://i.postimg.cc/j29076JZ/image-1.png" alt="Instagram" title="Instagram" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                    </a>

                    <a href="https://www.linkedin.com/company/devlly/" title="LinkedIn"
                      style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                      target="_blank"
                      data-saferedirecturl="https://www.google.com/url?q=https://www.linkedin.com/company/devlly/&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw1FF0sw_CbBNtkUgAPiqwPu">
                      <img src="https://ci3.googleusercontent.com/meips/ADKq_NYqCSH-6fPlZti3s7iUAtFoacx4CHqqIjsC7RExjMFN1_Yvkf3nRnoM57yhSZj4klAjDc5NJP-6vjNxHENRPg=s0-d-e1-ft#https://i.postimg.cc/63jFkVzt/image-3.png" alt="LinkedIn" title="LinkedIn" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                    </a>
                    <a href="https://x.com/devlly__" title="X"
                      style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                      target="_blank"
                      data-saferedirecturl="https://www.google.com/url?q=https://x.com/devlly__&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw21UVJ-OSRn3M0BjLRWZPVE">
                      <img src="https://ci3.googleusercontent.com/meips/ADKq_NZ0BVA4gDFWn25oE2_DafZnvo23K8F4_oPya3mDaS0bao3NWkIetLcq_3Dk_ptjCquv5-HKreXFUdyZVYfGEw=s0-d-e1-ft#https://i.postimg.cc/XJ7T11fs/image-4.png" alt="X" title="X" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                    </a>


                  </div>
                  <div class="m_-5387884785609020660contact-info" style="margin-bottom:20px;font-size:16px">
                    <a href="mailto:contact@devlly.net" style="text-decoration:none;color:#16217c" title="Email us"
                      target="_blank">
                      contact@devlly.net
                    </a><br>
                    <a href="tel:+213540323994" style="text-decoration:none;color:#16217c" title="Email us"
                      target="_blank">
                      +213540323994
                    </a>
                  </div>
                  <div class="m_-5387884785609020660unsubscribe" style="font-size:10px">
                    <p>Copyright © 2024 DEVLLY</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <img width="1px" height="1px" alt="" src="https://ci3.googleusercontent.com/meips/ADKq_NZqy3W1E-SgxGOB-zCvJhZrYlzXYwa1jwrRCoP2liZhSoUsVW0wgDv96sD7audDU6RU4bbD0dxENuvV6ENLGYF898rtAi8xG0s_Gkd5XX5cmFYRLziinyNqtHHj35PtrOSKmFlsJXlVUoB7WOaxTTQA25LeWcwS5QfsgKZLBYp4TrIGfyt7619VXsZqZKO9l5MhI-UN6_Yse5yiJggq7uphcud_w76FxzBIqiSUWlaRZ_iEDFWF2c7Dw1qN5RSPMefa3uFckTb38429zpwshUK_hYkzf6eFltYLOAU-7Q=s0-d-e1-ft#http://track.send.postdrop.io/o/eJwEwF0OgyAMAODTyCOpbaHlgcOUH6fJGEaWnX9fy0C7pOp63gVJQyAhd2Y-UgcMpBSRInBVoaTSBaJCKuyujIAMugsAYyB_FLUaick4MFfeGFb_NH_P9W3PvP013ZOtWFnmRz9t9Aa4MbyGXW9f53C_jP8AAAD__0fGJ8o" class="CToWUd" data-bit="iit">
    </div>

  </div>
</div>
</div>
</div>
            `
    const paymentLink = `https://devlly.net/?fluent-form=4&submission_id=${submissionId}&email=${encodeURIComponent(to)}`;
    const devisHTML = `
        <div id=":p3" class="ii gt"
      jslog="20277; u014N:xr6bB; 1:WyIjdGhyZWFkLWY6MTgwNzU4OTY2MTk3NDgxNTY5OSJd; 4:WyIjbXNnLWY6MTgwNzU5MzM3MjQxNDI3OTU1OSIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLDBd">
      <div id=":p2" class="a3s aiL msg-5387884785609020660 adM">
        <div class="HOEnZb">
          <div class="adm">
            <div id="q_4" class="ajR h4" data-tooltip="Masquer le contenu développé"
              aria-label="Masquer le contenu développé" aria-expanded="true">
              <div class="ajT"></div>
            </div>
          </div>
          <div class="im"><u></u>
            <div
              style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f9f9f9;margin:0;padding:0">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tbody>
                  <tr>
                    <td>
                      <div class="m_-5387884785609020660container"
                        style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:10px;background-color:#ffffff;box-sizing:border-box">
                        <a href="https://devlly.net" target="_blank"
                          data-saferedirecturl="https://www.google.com/url?q=https://devlly.net&amp;source=gmail&amp;ust=1723942146285000&amp;usg=AOvVaw3xNc1XysHTxCDvDbZthuc9">
                          <div style="text-align:center;margin-bottom:20px">
                            <img src="https://ci3.googleusercontent.com/meips/ADKq_NbyCwvOwsO9LYPLupNwWzZadrySm8Jpj_sbyw6MWQH4VKDletHagpIluJVhQmeDS22_r2p1=s0-d-e1-ft#https://i.imgur.com/KHUlNrv.png" alt="Devlly Agency Logo" style="width:200px;max-width:100%;height:auto" width="200" height="auto" class="CToWUd" data-bit="iit">
                          </div>
                        </a>
                        <h1 style="color:#16217c;font-size:24px;text-align:center">Your vision, our Code!</h1>
                        <p>Bonjour,</p>
                        <p>Merci d'avoir contacté Devlly Agency pour vos besoins en développement. Nous sommes ravis de vous
                          présenter votre devis personnalisé en pièce jointe, ainsi que notre contrat de services.</p>
                        <p>Pour faciliter le processus, nous avons également inclus un lien où vous pouvez procéder au
                          paiement directement si vous acceptez notre offre et les détails du contrat :</p>
                        <a href='${paymentLink}' class="m_-5387884785609020660button"
                          style="display:block;width:100%;padding:10px 20px;font-size:16px;color:white;background-color:#16217c;border-radius:20px;text-decoration:none;margin-top:20px;text-align:center;box-sizing:border-box">Effectuez
                          votre paiement</a>
                        <p>Si vous avez des questions ou des besoins supplémentaires, n'hésitez pas à nous contacter. Nous
                          sommes là pour vous aider.</p>
                        <p>Cordialement,<br>L'équipe Devlly Agency</p>
    
                        <div
                          style="margin-top:30px;text-align:center;border-top:1px solid #ddd;padding-top:15px;color:#555;background-color:#f8f9fa;padding:20px;box-sizing:border-box">
                          <div class="m_-5387884785609020660social-icons"
                            style="margin-bottom:20px;display:flex;justify-content:center;text-align:center">
                            <a href="https://www.facebook.com/profile.php?id=61553758615638&amp;locale=fr_FR"
                              title="Facebook"
                              style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                              target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/profile.php?id%3D61553758615638%26locale%3Dfr_FR&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw24B9IdlRbTZOjTQJwP8AWe">
                              <img src="https://ci3.googleusercontent.com/meips/ADKq_NYSTMLpBvDH97naOwn6YFuvBduRGkYOr6Ppm4EGE5mNJqcsbxHMJmGAswf1TD2v8SwgnHMIXlXHjhUw2gGwuA=s0-d-e1-ft#https://i.postimg.cc/xjFShQFM/image-2.png" alt="Facebook" title="Facebook" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                            </a>
                            <a href="https://www.instagram.com/devlly__/" title="Instagram"
                              style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                              target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q=https://www.instagram.com/devlly__/&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw3lnKZw_2TP5XbO5W562d32">
                              <img src="https://ci3.googleusercontent.com/meips/ADKq_Nbkb6kIifAsx57bQGo_H_CDP9aTHdoYprluDn75zs8RbWZYqJX0U1mppjM87Gana3IhhcvsBOyQAKMeBfV3Eg=s0-d-e1-ft#https://i.postimg.cc/j29076JZ/image-1.png" alt="Instagram" title="Instagram" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                            </a>
    
                            <a href="https://www.linkedin.com/company/devlly/" title="LinkedIn"
                              style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                              target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q=https://www.linkedin.com/company/devlly/&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw1FF0sw_CbBNtkUgAPiqwPu">
                              <img src="https://ci3.googleusercontent.com/meips/ADKq_NYqCSH-6fPlZti3s7iUAtFoacx4CHqqIjsC7RExjMFN1_Yvkf3nRnoM57yhSZj4klAjDc5NJP-6vjNxHENRPg=s0-d-e1-ft#https://i.postimg.cc/63jFkVzt/image-3.png" alt="LinkedIn" title="LinkedIn" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                            </a>
                            <a href="https://x.com/devlly__" title="X"
                              style="display:inline-block;margin:0 10px;text-decoration:none;font-size:24px;color:#16217c"
                              target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q=https://x.com/devlly__&amp;source=gmail&amp;ust=1723942146286000&amp;usg=AOvVaw21UVJ-OSRn3M0BjLRWZPVE">
                              <img src="https://ci3.googleusercontent.com/meips/ADKq_NZ0BVA4gDFWn25oE2_DafZnvo23K8F4_oPya3mDaS0bao3NWkIetLcq_3Dk_ptjCquv5-HKreXFUdyZVYfGEw=s0-d-e1-ft#https://i.postimg.cc/XJ7T11fs/image-4.png" alt="X" title="X" width="32" style="outline:none;text-decoration:none;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important" class="CToWUd" data-bit="iit">
                            </a>
    
    
                          </div>
                          <div class="m_-5387884785609020660contact-info" style="margin-bottom:20px;font-size:16px">
                            <a href="mailto:contact@devlly.net" style="text-decoration:none;color:#16217c" title="Email us"
                              target="_blank">
                              contact@devlly.net
                            </a><br>
                            <a href="tel:+213540323994" style="text-decoration:none;color:#16217c" title="Email us"
                              target="_blank">
                              +213540323994
                            </a>
                          </div>
                          <div class="m_-5387884785609020660unsubscribe" style="font-size:10px">
                            <p>Copyright © 2024 DEVLLY</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <img width="1px" height="1px" alt="" src="https://ci3.googleusercontent.com/meips/ADKq_NZqy3W1E-SgxGOB-zCvJhZrYlzXYwa1jwrRCoP2liZhSoUsVW0wgDv96sD7audDU6RU4bbD0dxENuvV6ENLGYF898rtAi8xG0s_Gkd5XX5cmFYRLziinyNqtHHj35PtrOSKmFlsJXlVUoB7WOaxTTQA25LeWcwS5QfsgKZLBYp4TrIGfyt7619VXsZqZKO9l5MhI-UN6_Yse5yiJggq7uphcud_w76FxzBIqiSUWlaRZ_iEDFWF2c7Dw1qN5RSPMefa3uFckTb38429zpwshUK_hYkzf6eFltYLOAU-7Q=s0-d-e1-ft#http://track.send.postdrop.io/o/eJwEwF0OgyAMAODTyCOpbaHlgcOUH6fJGEaWnX9fy0C7pOp63gVJQyAhd2Y-UgcMpBSRInBVoaTSBaJCKuyujIAMugsAYyB_FLUaick4MFfeGFb_NH_P9W3PvP013ZOtWFnmRz9t9Aa4MbyGXW9f53C_jP8AAAD__0fGJ8o" class="CToWUd" data-bit="iit">
            </div>
    
          </div>
        </div>
      </div>
    </div>
    
            `

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
    if (isMeet === "OK" || isMeet === "تمام") {
        // Schedule the meeting for the next day at 4 PM
       
        mailOptions = {
            from: '"Devlly Agency" <' + senderEmail + '>',
            to: to,
            subject: submissionId, // Use submissionId as the email subject
            html: meetHTML,
        };
        console.log("we sent a meeting email");
    } else {
      
        mailOptions = {
            from: '"Devlly Agency" <' + senderEmail + '>',
            to: to,
            subject: submissionId, // Use submissionId as the email subject
            html: devisHTML,
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

                // Create the email message as MIME format
                let rawEmail = [
                    `From: "Devlly Agency" <${senderEmail}>`,
                    `To: "${submissionId}" <${to}>`,
                    `Subject: ${subject}`,
                    'MIME-Version: 1.0',
                    'Content-Type: multipart/mixed; boundary="boundary"',
                    '',
                    '--boundary',
                    'Content-Type: text/html; charset=utf-8',
                    'Content-Transfer-Encoding: 7bit',
                    '',
                    meetHTML, // If this was the meeting email, use `meetHTML`, otherwise use `devisHTML`
                    '--boundary',
                ];

                // Attach files if it's not a meeting email
                if (mailOptions.attachments) {
                    for (const attachment of mailOptions.attachments) {
                        const attachmentData = require('fs').readFileSync(attachment.path).toString('base64');
                        rawEmail.push(
                            `Content-Type: ${attachment.filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'}; name="${attachment.filename}"`,
                            'Content-Transfer-Encoding: base64',
                            `Content-Disposition: attachment; filename="${attachment.filename}"`,
                            '',
                            attachmentData,
                            '--boundary'
                        );
                    }
                }

                rawEmail.push('--boundary--', '');

                // Convert the rawEmail array to a single string
                const emailMessage = rawEmail.join('\r\n');

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



