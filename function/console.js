const fs = require('fs');
const path = require('path');

// Path to the EJS file
const ejsFilePath = path.join(__dirname, '../resources/components/creation.ejs');

// The content snippet to check for
const requiredContent = `
<div class="mx-auto px-2 sm:px-6 lg:px-8">
    <center><div class="semi-bold text-white">© By <a href="https://github.com/hydren-dev/HydrenDashboard" class="text-blue-500">HydrenDashboard</a></div></center>
</div>
`;

// Function to normalize the content (remove extra spaces and newlines)
function normalizeContent(content) {
    return content.replace(/\s+/g, ' ').trim();
}

// Function to check for the required content in the EJS file
function checkFileContent(filePath, contentToCheck) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log('Starting HydrenDashboard'); // Log the file content

        // Normalize both the file content and the required content
        const normalizedFileContent = normalizeContent(fileContent);
        const normalizedRequiredContent = normalizeContent(contentToCheck);

        if (normalizedFileContent.includes(normalizedRequiredContent)) {
            console.log('Checking Routes');
        } else {
            console.error('🛑: Required content not found in the EJS file. (did you changed creation.ejs?)');
            process.exit(1); // Exit with error code
        }
    } catch (err) {
        console.error(`🛑 reading the file: ${err.message}`);
        process.exit(1); // Exit with error code
    }
}

// Run the check
checkFileContent(ejsFilePath, requiredContent);
