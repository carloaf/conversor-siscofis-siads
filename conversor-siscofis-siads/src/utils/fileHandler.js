module.exports = {
    saveUploadedFile: (file, uploadPath) => {
        const fs = require('fs');
        const path = require('path');

        const filePath = path.join(uploadPath, file.originalname);
        fs.writeFileSync(filePath, file.buffer);
        return filePath;
    },

    readOutputFile: (filePath) => {
        const fs = require('fs');

        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        } else {
            throw new Error('Output file does not exist');
        }
    }
};