const axios = require('axios');

const skyport = {
    url: process.env.SKYPORT_URL,
    key: process.env.SKYPORT_KEY
};

// Figure out how what the user's total resource usage is right now
async function calculateResource(userID, resource) {
    try {
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
            }
        });

        console.log(`Calculating Resources for ${userID}: ${totalResources}`);
        return totalResources;

    } catch (error) {
        console.error(`Error calculating resources for user ${userID}:`, error.message);
        throw error; // Optional: re-throw the error if you want to propagate it
    }
}

module.exports = { calculateResource };
