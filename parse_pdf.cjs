const fs = require('fs');
let pdfparse;
try {
    pdfparse = require('pdf-parse/lib/pdf-parse.js');
} catch(e) {
    pdfparse = require('pdf-parse');
}

async function main() {
    let dataBuffer = fs.readFileSync('c:/Users/netne/ReserachMate/Docs/UPDATE1 (4).pdf');
    try {
        let pdfParser = typeof pdfparse === 'function' ? pdfparse : null;
        if (!pdfParser) {
            console.log("No default function. Trying to find it:");
            if (typeof pdfparse.default === 'function') pdfParser = pdfparse.default;
            else if (typeof pdfparse.PDFParse === 'function') pdfParser = pdfparse.PDFParse;
            else {
                for (let k in pdfparse) { if (typeof pdfparse[k] === 'function') console.log("function: ", k); }
            }
        }
        
        if (pdfParser) {
            let data = await pdfParser(dataBuffer);
            fs.writeFileSync('c:/Users/netne/ReserachMate/pdf_text.txt', data.text);
            console.log("PDF written to pdf_text.txt");
        } else {
            console.log("Failed to find parser");
        }
    } catch(e) {
        console.error(e);
        fs.writeFileSync('c:/Users/netne/ReserachMate/pdf_text.txt', e.toString());
    }
}
main();
