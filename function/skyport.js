const axios = require('axios');
require('dotenv').config(); // Load environment variables
const CatLoggr = require('cat-loggr');

const log = new CatLoggr();


// Function to check Skyport
async function checkSkyport() {
    const url = process.env.SKYPORT_URL;

    if (!url) {
        log.error('Invalid Skyport URL');
        process.exit(1);
    }

    try {
        const response = await axios.get(url);

        if (response.status === 200) {
        } else {
            log.error(`🛑 Skyport isn't Running. Status Code: ${response.status}`);
            process.exit(1);
        }
    } catch (info) {
        if (info.response) {
            // Server responded with a status other than 2xx
            log.error(`🛑 Skyport isn't Running. Status Code: ${info.response.status}`);
            process.exit(1);
        } else if (info.request) {
            // Request was made but no response was received
            log.error('🛑 Skyport isn\'t Running');
            process.exit(1);
        } else {
            // Something else happened in making the request
            log.error('🛑 Invalid Skyport URL');
            process.exit(1);
        }
    }
}

// Run the check
checkSkyport();
