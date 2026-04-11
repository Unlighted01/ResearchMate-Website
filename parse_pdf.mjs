import fs from 'fs';
import pdf from 'pdf-parse';

async function main() {
    let dataBuffer = fs.readFileSync('c:/Users/netne/ReserachMate/Docs/UPDATE1 (4).pdf');
    try {
        let pdfParser = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);
        if (typeof pdfParser !== 'function') {
            console.log("No valid parsing function found");
            console.log(pdf);
        } else {
            let data = await pdfParser(dataBuffer);
            fs.writeFileSync('c:/Users/netne/ReserachMate/pdf_text.txt', data.text);
            console.log("PDF written to pdf_text.txt");
        }
    } catch(e) {
        console.error(e);
        fs.writeFileSync('c:/Users/netne/ReserachMate/pdf_text.txt', e.toString());
    }
}
main();
