const TxtFormatterService = require('../src/services/txtFormatterService');

describe('TxtFormatterService', () => {
    let formatter;

    beforeEach(() => {
        formatter = new TxtFormatterService();
    });

    test('should format extracted data correctly', () => {
        const extractedData = {
            title: 'Sample Title',
            date: '2023-10-01',
            items: [
                { name: 'Item 1', quantity: 10, price: 5.00 },
                { name: 'Item 2', quantity: 5, price: 15.00 }
            ]
        };

        const expectedOutput = `Title: Sample Title
Date: 2023-10-01
Items:
- Item 1: 10 units at $5.00 each
- Item 2: 5 units at $15.00 each
`;

        const formattedData = formatter.formatData(extractedData);
        expect(formattedData).toBe(expectedOutput);
    });

    test('should handle empty data gracefully', () => {
        const extractedData = {};

        const expectedOutput = `Title: 
Date: 
Items:
`;

        const formattedData = formatter.formatData(extractedData);
        expect(formattedData).toBe(expectedOutput);
    });
});