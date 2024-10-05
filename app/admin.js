const express = require('express');
const axios = require('axios');
const fs = require('fs');

const { db } = require('../function/db');
const { ensureAuthenticated } = require('../function/ensureAuthenticated.js');

const router = express.Router();

const skyport = {
    url: process.env.SKYPORT_URL,
    key: process.env.SKYPORT_KEY
};

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

// Admin
router.get('/admin', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        res.render('admin', {
            user: req.user, // User info
            coins: await db.get(`coins-${req.user.email}`), // User's coins
            discordserver: process.env.DISCORD_SERVER,
            req: req, // Request (queries)
            admin: await db.get(`admin-${req.user.email}`), // Admin status
            name: process.env.APP_NAME // App name
        });
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/images', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
      if (await db.get(`admin-${req.user.email}`) == true) {
          res.render('admin_images', {
              user: req.user, // User info
              coins: await db.get(`coins-${req.user.email}`), // User's coins
              discordserver: process.env.DISCORD_SERVER,
              req: req, // Request (queries)
              admin: await db.get(`admin-${req.user.email}`), // Admin status
              images: require('../storage/images.json'), // Images data
              name: process.env.APP_NAME // App name
          });
      } else {
          res.redirect('/dashboard');
      }
  });
  router.get('/nodes', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
      if (await db.get(`admin-${req.user.email}`) == true) {
          res.render('admin_nodes', {
              user: req.user, // User info
              coins: await db.get(`coins-${req.user.email}`), // User's coins
              discordserver: process.env.DISCORD_SERVER,
              req: req, // Request (queries)
              admin: await db.get(`admin-${req.user.email}`), // Admin status
              nodes: require('../storage/nodes.json'), // Images data
              name: process.env.APP_NAME // App name
          });
      } else {
          res.redirect('/dashboard');
      }
  });  

// Scan eggs & locations
router.get('/scanimages', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
        if (await db.get(`admin-${req.user.email}`) == true) {
        try {
            const response = await axios.get(`${skyport.url}/api/images`, {
                headers: {
                    'x-api-key': skyport.key
                }
            });

            const images = response.data;
            const formattedImages = images.map(image => ({
                Image: image.Image,
                Cmd: image.Cmd,
                Env: image.Env,
                Variables: image.Variables,
                Scripts: image.Scripts,
                Name: image.Name,
                Description: image.Description,
                Author: image.Author,
                AuthorName: image.AuthorName,
                Meta: image.Meta,
                Id: image.Id
            }));

            let existingImages = [];
            try {
                const existingImagesData = fs.readFileSync('storage/images.json');
                existingImages = JSON.parse(existingImagesData);
            } catch (error) {
                console.log("No existing images file found.");
            }

            const allImages = [...existingImages, ...formattedImages];
            fs.writeFileSync('storage/images.json', JSON.stringify(formattedImages, null, 2));

            res.redirect('/admin?success=COMPLETE');
        } catch (error) {
            console.error(`Error fetching images: ${error}`);
            res.send(`Error fetching images: ${error}`);
        }
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/scannodes', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        try {
            const response = await axios.get(`${skyport.url}/api/nodes`, {
                headers: {
                    'x-api-key': skyport.key
                }
            });

            const nodes = response.data;
            const formattedNodes = nodes.map(node => ({
                id: node.id,
                name: node.name,
                tags: node.tags,
                processor: node.processor,
                ram: node.ram,
                disk: node.disk
            }));

            let existingNodes = [];
            try {
                const existingNodesData = fs.readFileSync('storage/nodes.json');
                existingNodes = JSON.parse(existingNodesData);
            } catch (error) {
                console.log("No existing nodes file found.");
            }

            const allNodes = [...existingNodes, ...formattedNodes];
            fs.writeFileSync('storage/nodes.json', JSON.stringify(allNodes, null, 2));

            res.redirect('/admin?success=COMPLETE');
            console.log(nodes);
        } catch (error) {
            console.error(`Error fetching nodes: ${error}`);
            res.send(`Error Fetching Nodes${error}`);
        }
    } else {
        res.redirect('/dashboard');
    }
});

// Set & Add coins
router.get('/addcoins', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email, amount } = req.query;
    
        if (!email || !amount) return res.redirect('/admin?err=INVALIDPARAMS');
        let amountParse = parseInt((await db.get(`coins-${email}`))) + parseInt(amount);
        await db.set(`coins-${email}`, amountParse);
        res.redirect('/admin?success=COMPLETE');
        await sendDiscordNotification(`Admin Have Added ${amount} of coins in ${email} account.`);
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/setcoins', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email, amount } = req.query;

        if (!email || !amount) return res.redirect('/admin?err=INVALIDPARAMS');
        let amountParse = parseInt(amount);
        await db.set(`coins-${email}`, amountParse);
        res.redirect('/admin?success=COMPLETE');
        await sendDiscordNotification(`Admin Have Set ${amount} of coins in ${email} account.`);
    } else {
        res.redirect('/dashboard');
    }
});

// Set & Add resources
router.get('/addresources', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email, cpu, ram, disk } = req.query;
        if (!email || !cpu || !ram || !disk) return res.redirect('/admin?err=INVALIDPARAMS');

        // Resource amounts
        let cpuAmount = parseInt(cpu) * 100;
        let ramAmount = parseInt(ram) * 1024;
        let diskAmount = parseInt(disk) * 1024;

        // Ensure amount are numbers
        if (isNaN(cpuAmount) || isNaN(ramAmount) || isNaN(diskAmount)) return res.redirect('/admin?err=INVALIDAMOUNT');
        
        // Current resources
        let currentCpu = parseInt(await db.get(`cpu-${email}`)) || 0;
        let currentRam = parseInt(await db.get(`ram-${email}`)) || 0;
        let currentDisk = parseInt(await db.get(`disk-${email}`)) || 0;

        // Update resources
        await db.set(`cpu-${email}`, currentCpu + cpuAmount);
        await db.set(`ram-${email}`, currentRam + ramAmount);
        await db.set(`disk-${email}`, currentDisk + diskAmount);

        res.redirect('/admin?success=COMPLETE');
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/setresources', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email, cpu, ram, disk } = req.query;
        if (!email || !cpu || !ram || !disk) return res.redirect('/admin?err=INVALIDPARAMS');

        // Resource amounts
        let cpuAmount = parseInt(cpu) * 100;
        let ramAmount = parseInt(ram) * 1024;
        let diskAmount = parseInt(disk) * 1024;

        // Ensure amount are numbers
        if (isNaN(cpuAmount) || isNaN(ramAmount) || isNaN(diskAmount)) return res.redirect('/admin?err=INVALIDAMOUNT');

        // Update resources
        await db.set(`cpu-${email}`, cpuAmount);
        await db.set(`ram-${email}`, ramAmount);
        await db.set(`disk-${email}`, diskAmount);

        res.redirect('/admin?success=COMPLETE');
    } else {
        res.redirect('/dashboard');
    }
});

// Ban & Unban 
router.get('/ban', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email, reason } = req.query;
        if (!email) return res.redirect('/admin?err=INVALIDPARAMS');
        
        await db.set(`banned-${email}`, reason);
        res.redirect('/admin?success=BANNED');
        await sendDiscordNotification(`Admin Have Banned ${email} account With Reason ${reason}.`);
    } else {
        res.redirect('/dashboard');
    }
});

router.get('/unban', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    if (await db.get(`admin-${req.user.email}`) == true) {
        const { email } = req.query;
        if (!email) return res.redirect('/admin?err=INVALIDPARAMS');
        
        await db.delete(`banned-${email}`);
        res.redirect('/admin?success=UNBANNED');
        await sendDiscordNotification(`Admin Have UnBanned ${email}.`);
    } else {
        res.redirect('/dashboard');
    }
});

module.exports = router;