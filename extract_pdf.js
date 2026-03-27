
const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:\\Users\\netne\\ReserachMate\\UPDATE1 (4).pdf');

pdf(dataBuffer).then(function(data) {
    console.log("---PDF_TEXT_START---");
    console.log(data.text);
    console.log("---PDF_TEXT_END---");
}).catch(function(error) {
    console.error("Error parsing PDF:", error);
});
