const axios = require('axios');
require('dotenv').config(); // Load environment variables

// Function to check Skyport
async function checkSkyport() {
    const url = process.env.SKYPORT_URL;

    if (!url) {
        console.log('Skyport invalid URL');
        process.exit(1);
    }

    try {
        const response = await axios.get(url);

        if (response.status === 200) {
            console.log('✅ Skyport is Running Great');
        } else {
            console.log(`🛑 Skyport isn't Running. Status Code: ${response.status}`);
        }
    } catch (info) {
        if (info.response) {
            // Server responded with a status other than 2xx
            console.log(`🛑 Skyport isn't Running. Status Code: ${info.response.status}`);
        } else if (info.request) {
            // Request was made but no response was received
            console.log('🛑 Skyport isn\'t Running');
        } else {
            // Something else happened in making the request
            console.log('🛑 Skyport invalid URL');
        }
    }
}

// Run the check
checkSkyport();