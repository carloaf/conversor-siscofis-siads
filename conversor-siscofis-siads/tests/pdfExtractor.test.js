const PdfExtractorService = require('../src/services/pdfExtractorService');
const fs = require('fs');
const path = require('path');

describe('PdfExtractorService', () => {
    let pdfExtractorService;

    beforeAll(() => {
        pdfExtractorService = new PdfExtractorService();
    });

    test('should extract data from a valid PDF file', async () => {
        const pdfFilePath = path.join(__dirname, 'test-files', 'Relatorio de almox conta 26.pdf');
        const extractedData = await pdfExtractorService.extractData(pdfFilePath);
        
        expect(extractedData).toBeDefined();
        expect(extractedData).toHaveProperty('someExpectedProperty'); // Replace with actual expected properties
    });

    test('should throw an error for an invalid PDF file', async () => {
        const invalidPdfFilePath = path.join(__dirname, 'test-files', 'invalid.pdf');
        
        await expect(pdfExtractorService.extractData(invalidPdfFilePath)).rejects.toThrow('Error extracting data');
    });

    afterAll(() => {
        // Clean up if necessary
    });
});