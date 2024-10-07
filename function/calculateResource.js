const axios = require('axios');
const { db } = require('./db'); // Ensure this path is correct

const skyport = {
    url: process.env.SKYPORT_URL,
    key: process.env.SKYPORT_KEY
};

// Figure out how much the user's total resource usage is right now
async function calculateResource(userID, resource) {
    try {
        // Fetch user instances from the API
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

        // Calculate total resources from API response
        let totalResources = 0;
        response.data.forEach(server => {
            if (server[resource] !== undefined) {
                let resourceValue = server[resource];
                if (resource === 'Cpu') {
                    resourceValue *= 100; // Assuming this conversion is needed
                }
                totalResources += resourceValue;
            }
        });

        // Retrieve additional server resources from the database
        for (const server of response.data) {
            const serverId = server.Id; // Assuming the server has an Id property
            const dbServerData = await db.get(`server_${serverId}`);

            if (dbServerData && dbServerData[resource] !== undefined) {
                let resourceValue = dbServerData[resource];
                if (resource === 'Cpu') {
                    resourceValue *= 100; // Again, applying conversion if necessary
                }
                totalResources += resourceValue;
            }
        }
        return totalResources;
        console.log(`Starting Resource Calulation for ${userID}`);

    } catch (error) {
        console.error(`Error calculating resources for user ${userID}:`, error.message);
        throw error; // Optional: re-throw the error if you want to propagate it
    }
}

module.exports = { calculateResource };
