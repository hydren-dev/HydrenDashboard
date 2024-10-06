const express = require('express');
const axios = require('axios');
const fs = require('fs');

const { db } = require('../function/db');
const { calculateResource } = require('../function/calculateResource');
const { ensureAuthenticated } = require('../function/ensureAuthenticated');
const { getRandomPort } = require('../function/getRandomPort');

const router = express.Router();

async function sendDiscordNotification(message) {
  const webhookURL = process.env.DISCORD_WEBHOOK_URL;
  const notificationsEnabled = process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true';

  if (!notificationsEnabled) {
    return;
  }

  if (!webhookURL) {
   log.warn('Discord webhook URL is not set.');
    return;
  }

  const embed = {
    title: 'Hydren Logging',
    description: message,
    color: 3066993, // Green color
    thumbnail: {
      url: process.env.EMBED_THUMBNAIL_URL || 'https://example.com/default-thumbnail.png' // Default thumbnail URL
    },
    timestamp: new Date().toISOString(),
  };

  const data = {
    username: 'Dashboard',
    embeds: [embed],
  };

  try {
    await axios.post(webhookURL, data);
  } catch (error) {
    log.error(`❗ Error sending notification to Discord: ${error.message}`);
  }
}

const skyport = {
  url: process.env.SKYPORT_URL,
  key: process.env.SKYPORT_KEY
};

// Existing resources (the ones in use on servers)
const existingResources = async (userID) => {
  return {
    "cpu": await calculateResource(userID, 'Cpu'),
    "ram": await calculateResource(userID, 'Memory'),
    "disk": await calculateResource(userID, 'Disk')
  };
};

// Max resources (the ones the user has purchased or been given)
const maxResources = async (email) => {
  return {
    "cpu": await db.get(`cpu-${email}`),
    "ram": await db.get(`ram-${email}`),
    "disk": await db.get(`disk-${email}`)
  };
};

// Delete server
router.get('/delete', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
  if (!req.query.id) return res.redirect('../servers?err=MISSINGPARAMS');

  try {
      const userId = await db.get(`id-${req.user.email}`);
      const serverId = req.query.id;

      const server = await axios.post(`${skyport.url}/api/getInstance`, {
          id: serverId
      }, {
          headers: {
              'x-api-key': skyport.key
          }
      });

      if (server.data.User !== userId) return res.redirect('../servers?err=DONOTOWN');

      // Delete the server instance
      await axios.delete(`${skyport.url}/api/instance/delete`, {
          headers: {
              'x-api-key': skyport.key
          },
          data: {
              id: serverId
          }
      });

      // Delete the associated server data from Keyv
      await db.delete(`server_${userId}`);

      res.redirect('/servers?success=DELETED');
      await sendDiscordNotification(`${req.user.email} Have Deleted the Server with \n**ID**: ${serverId}.`);
  } catch (error) {
      if (error.response && error.response.status === 404) return res.redirect('../servers?err=NOTFOUND');
      
      console.error(error);
      res.send('Internal Error While Deleting the Server');
  }
});



// Create server
router.get('/create', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (!req.query.name || !req.query.node || !req.query.image || !req.query.cpu || !req.query.ram) 
        return res.redirect('../create-server?err=MISSINGPARAMS');

    // Resource checks
    const max = await maxResources(req.user.email);
    const existing = await existingResources(req.user.id);
    if (parseInt(req.query.cpu) > parseInt(max.cpu - existing.cpu)) 
        return res.redirect('../create-server?err=NOTENOUGHRESOURCES');
    if (parseInt(req.query.ram) > parseInt(max.ram - existing.ram)) 
        return res.redirect('../create-server?err=NOTENOUGHRESOURCES');

    if (parseInt(req.query.ram) < 128) return res.redirect('../create-server?err=INVALID');
    if (parseInt(req.query.cpu) < 0) return res.redirect('../create-server?err=INVALID');

  if (req.query.name.length > 100 || req.query.name.length < 3) {
      return res.redirect('../create-server?err=INVALID_NAME');
  }
  if (isNaN(req.query.cpu)) {
      return res.redirect('../create-server?err=INVALID_CPU');
  }
  if (isNaN(req.query.ram)) {
      return res.redirect('../create-server?err=INVALID_RAM');
  }

    try {
        const userId = await db.get(`id-${req.user.email}`);
        const name = req.query.name;
        const nodeId = req.query.node;
        const imageId = req.query.image;
        const cpu = parseInt(req.query.cpu);
        const memory = parseInt(req.query.ram);
        const imagename = req.query.imageName;

        // Parse JSON variables
        const variables = JSON.parse(decodeURIComponent(req.query.variables || '{}'));

        const portsData = require('../storage/ports.json');
        const selectedPortKey = getRandomPort(portsData.portAvailable);
        const selectedPort = portsData.portAvailable[selectedPortKey];

        if (!selectedPort || !selectedPortKey) {
            console.error('No ports available');
            return res.redirect('../create-server?err=NOPORTAVAILABLE');
        }

        portsData.portInUse[selectedPortKey] = selectedPort;
        delete portsData.portAvailable[selectedPortKey];

        fs.writeFileSync('./storage/ports.json', JSON.stringify(portsData, null, 2), 'utf-8');

        const images = require('../storage/images.json');
        const image2 = images.find(image => image.Image === imageId);
        if (!image2) return res.redirect('../create-server?err=INVALID_IMAGE');
        const image = image2.Image;

        const response = await axios.post(`${skyport.url}/api/instances/deploy`, {
            image,
            imagename, 
            memory,
            cpu,
            ports: selectedPort,
            primary: selectedPort,
            nodeId,
            name,
            user: userId,
            variables
        }, {
            headers: {
                'x-api-key': skyport.key
            }
        });

        const serverData = {
          name,
          cpu,
          memory,
          image,
          variables: JSON.stringify(variables),    
      };
      
      // Use req.user.email as the key instead of serverId
      await db.set(`server_${userId}`, serverData);
      
      res.redirect('/servers?err=CREATED');
      await sendDiscordNotification(`${req.user.email} Have Created a Server with:\n**CPU**: ${cpu}\n**RAM**: ${memory}\nName: ${name}.`);
      
      } catch (error) {
          console.error(error);
          res.redirect('../create-server?err=ERRORONCREATE');
      }      
});


router.get('/create-server', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    res.render('create', {
      req: req, // Requests (queries) 
      name: process.env.APP_NAME,
      user: req.user, // User info (if logged in)
      admin: await db.get(`admin-${req.user.email}`), // Admin status
      discordserver: process.env.DISCORD_SERVER,
      coins: await db.get(`coins-${req.user.email}`), // Coins
      images: require('../storage/images.json'), // Images data
      theme: require('../storage/theme.json'), // Theme data
      nodes: require('../storage/nodes.json') // Nodes data
    });
});

module.exports = router;
