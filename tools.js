

function dot(input) {
    // Check if the input is a number
    if (typeof input === 'number' && !isNaN(input)) {
        return new Intl.NumberFormat('de-DE').format(input);
    } else {
        // Return the input as is if it's not a number
        return input;
    }
}


module.exports = {dot}