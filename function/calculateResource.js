const axios = require('axios');
const fs = require('fs');

const skyport = {
    url: process.env.SKYPORT_URL,
    key: process.env.SKYPORT_KEY
};

// Figure out how what the user's total resource usage is right now
async function calculateResource(userID, resource) {
    try {
      console.log("Connection from", userID);
  
      const response = await axios.post(`${skyport.url}/api/getUserInstance`, {
        userId: userID
      }, {
        headers: {
          'x-api-key': skyport.key,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response data format');
      }
  
      // Calculate total resources
      let totalResources = 0;
      response.data.forEach(server => {
        if (server[resource] !== undefined) {
          let resourceValue = server[resource];
          if (resource === 'Cpu') {
            resourceValue *= 100;
          }
          totalResources += resourceValue;
        } else {
          log.warn(`Resource ${resource} not found in server data`, server);
        }
      });
  
      return totalResources;
    } catch (err) {
      // Log errors to a file
      const errorMessage = `[LOG] Failed to calculate resources for user ${userID}. Error: ${err.message}\n`;
      log.error(errorMessage);
      fs.appendFile(process.env.LOGS_ERROR_PATH, errorMessage, (err) => {
        if (err) log.error(`Failed to save log: ${err.message}`);
      });
      throw err;
    }
};

module.exports = { calculateResource }