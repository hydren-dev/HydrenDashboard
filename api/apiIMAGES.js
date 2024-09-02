const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Middleware to check the API key
router.use('/application/images', (req, res, next) => {
    const apiKey = req.query.key;
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }
    next();
});

// Route to serve filtered images.json file
router.get('/application/images', (req, res) => {
    const filePath = path.join(__dirname, '../storage/images.json');

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Read the file and send filtered content as a response
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        try {
            const jsonData = JSON.parse(data);

            const filteredData = jsonData.map(item => ({
                Name: item.Name,
                Image: item.Image,
                Id: item.Id
            }));

            res.json(filteredData);
        } catch (parseError) {
            return res.status(500).json({ error: 'Error parsing JSON data' });
        }
    });
});

module.exports = router;