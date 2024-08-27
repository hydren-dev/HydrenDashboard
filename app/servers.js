const express = require('express');
const axios = require('axios');
const fs = require('fs');

const { db } = require('../function/db');
const { calculateResource } = require('../function/calculateResource');
const { ensureAuthenticated } = require('../function/ensureAuthenticated');
const { getRandomPort } = require('../function/getRandomPort');

const router = express.Router();

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
        console.log(server.data)

        if (server.data.User !== userId) return res.redirect('../servers?err=DONOTOWN');

        console.log("a")
        await axios.delete(`${skyport.url}/api/instance/delete`, {
          headers: {
            'x-api-key': skyport.key
          },
          data: {
            id: serverId
          }
        });
        

        res.redirect('/servers?success=DELETE');
    } catch (error) {
        if (error.response && error.response.status === 404) return res.redirect('../servers?err=NOTFOUND');
        
        console.error(error);
        res.redirect('../servers?err=INTERNALERROR');
    }
});

// Create server
router.get('/create', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
  if (!req.query.name || !req.query.node || !req.query.image || !req.query.cpu || !req.query.ram) return res.redirect('../create-server?err=MISSINGPARAMS'); //  || !req.query.disk
  
  // Check if user has enough resources to create a server

  const max = await maxResources(req.user.email);
  const existing = await existingResources(req.user.id);

  if (parseInt(req.query.cpu) > parseInt(max.cpu - existing.cpu)) return res.redirect('../create-server?err=NOTENOUGHRESOURCES');
  if (parseInt(req.query.ram) > parseInt(max.ram - existing.ram)) return res.redirect('../create-server?err=NOTENOUGHRESOURCES');
  // if (parseInt(req.query.disk) > parseInt(max.disk - existing.disk)) return res.redirect('../create-server?err=NOTENOUGHRESOURCES');

  // Ensure resources are above 128MB / 0 core

  if (parseInt(req.query.ram) < 128) return res.redirect('../create-server?err=INVALID');
  if (parseInt(req.query.cpu) < 0) return res.redirect('../create-server?err=INVALID');
  // if (parseInt(req.query.disk) < 128) return res.redirect('../create-server?err=INVALID');

  // Name checks

  if (req.query.name.length > 100) return res.redirect('../create-server?err=INVALID');
  if (req.query.name.length < 3) return res.redirect('../create-server?err=INVALID');

  // Make sure node, image, resources are numbers
  if ( isNaN(req.query.cpu) || isNaN(req.query.ram)) return res.redirect('../create-server?err=INVALID'); // || isNaN(req.query.disk) || isNaN(req.query.node) || isNaN(req.query.image) ||
  if (req.query.cpu < 0 || req.query.ram < 1) return res.redirect('../create-server?err=INVALID'); // || req.query.disk < 1

  try {
      const userId = await db.get(`id-${req.user.email}`);
      const name = req.query.name;
      const nodeId = req.query.node;
      const imageId = req.query.image;
      const cpu = parseInt(req.query.cpu);
      const memory = parseInt(req.query.ram);
      // const disk = parseInt(req.query.disk); 

      const portsData  = require('../storage/ports.json');
      const selectedPortKey = getRandomPort(portsData.portAvailable);
      const selectedPort = portsData.portAvailable[selectedPortKey];

      if(!selectedPort || !selectedPortKey) {
        console.error('No ports available');
      }

      portsData.portInUse[selectedPortKey] = selectedPort;
      delete portsData.portAvailable[selectedPortKey];

      fs.writeFileSync('./storage/ports.json', JSON.stringify(portsData, null, 2), 'utf-8');

      const images = require('../storage/images.json');

       const image2 = images.find(image => image.Id === imageId);
      if (!image2) return res.redirect('../create-server?err=INVALID_IMAGE');
      const imagename = image2.Name;
      const image = image2.Image;

      await axios.post(`${skyport.url}/api/instances/deploy`, {
          image,
          imagename,
          memory,
          cpu,
          ports: selectedPort,
          nodeId,
          name,
          user: userId,
          primary: selectedPort
      }, {
          headers: {
            'x-api-key': skyport.key
          }
      });

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
      nodes: require('../storage/nodes.json') // Nodes data
    });
});

module.exports = router;
