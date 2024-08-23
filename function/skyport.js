const axios = require('axios');
const chalk = require('chalk')
require('dotenv').config(); // Load environment variables
const CatLoggr = require('cat-loggr');

const log = new CatLoggr();

log.init = (message) => {
    process.stdout.write(`${chalk.gray(message)}\n`);
  };
  log.error = (message) => {
    process.stdout.write(`${chalk.gray('master | ')} ${message}\n`);
  };
  log.warn = (message) => {
    process.stdout.write(`${chalk.gray('master | ')} ${message}\n`);
  };
  console.info = (message) => {
    process.stdout.write(`${chalk.gray(message)}\n`);
  };

// Function to check Skyport
async function checkSkyport() {
    const url = process.env.SKYPORT_URL;

    if (!url) {
        log.warn('Skyport invalid URL');
        process.exit(1);
    }

    try {
        const response = await axios.get(url);

        if (response.status === 200) {
            log.warn('✅ Skyport is Running Great');
        } else {
            log.warn(`🛑 Skyport isn't Running. Status Code: ${response.status}`);
        }
    } catch (info) {
        if (info.response) {
            // Server responded with a status other than 2xx
            log.warn(`🛑 Skyport isn't Running. Status Code: ${info.response.status}`);
        } else if (info.request) {
            // Request was made but no response was received
            log.warn('🛑 Skyport isn\'t Running');
        } else {
            // Something else happened in making the request
            log.warn('🛑 Skyport invalid URL');
        }
    }
}

// Run the check
checkSkyport();
