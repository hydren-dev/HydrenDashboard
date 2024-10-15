const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const { db } = require('../function/db');
const { ensureAuthenticated } = require('../function/ensureAuthenticated.js');

const router = express.Router();

const resourceCosts = {
    cpu: process.env.CPU_COST,
    ram: process.env.RAM_COST,
    disk: process.env.DISK_COST,
    backup: process.env.BACKUP_COST,
    database: process.env.DATABASE_COST,
    allocation: process.env.ALLOCATION_COST
};

let earners = {};

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

// Afk

router.ws('/afkwspath', async (ws, req) => {
    if (!req.user || !req.user.email || !req.user.id) return ws.close();
    if (earners[req.user.email] == true) return ws.close();
    const timeConf = process.env.AFK_TIME;
    let time = timeConf;
    earners[req.user.email] = true;
    let aba = setInterval(async () => {
        if (earners[req.user.email] == true) {
            time--;
            if (time <= 0) {
                time = timeConf;
                ws.send(JSON.stringify({ "type": "coin" }));
                let r = parseInt((await db.get(`coins-${req.user.email}`))) + 1;
                await db.set(`coins-${req.user.email}`, r);
            }
            ws.send(JSON.stringify({ "type": "count", "amount": time }));
        }
    }, 1000);
    ws.on('close', async () => {
        delete earners[req.user.email];
        clearInterval(aba);
    });
});

router.get('/afk', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    res.render('afk', {
        user: req.user, // User info
        coins: await db.get(`coins-${req.user.email}`), // User's coins
        discordserver: process.env.DISCORD_SERVER,
        req: req, // Request (queries)
        admin: await db.get(`admin-${req.user.email}`), // Admin status
        theme: require('../storage/theme.json'), // Theme data
        name: process.env.APP_NAME // App name
    });
});

// Store

const plansFilePath = path.join(__dirname, '../storage/plans.json');
const plansJson = fs.readFileSync(plansFilePath, 'utf-8');
const plans = JSON.parse(plansJson);

router.get('/store', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    
    const userCurrentPlan = await db.get(`plan-${req.user.email}`);

    const resourcePlans = Object.values(plans.PLAN).map(plan => {
      return {
        ...plan,
        hasPlan: userCurrentPlan === plan.name.toUpperCase()
      };
    });
    res.render('store', {
        user: req.user, // User info
        coins: await db.get(`coins-${req.user.email}`), // User's coins
        req: req, // Request (queries)
        discordserver: process.env.DISCORD_SERVER,
        admin: await db.get(`admin-${req.user.email}`), // Admin status
        name: process.env.APP_NAME, // App name
        resourceCosts: resourceCosts, // Cost Ressources
        theme: require('../storage/theme.json'), // Theme data
        resourcePlans: resourcePlans // List plans
    });
});


router.get('/buyresource', ensureAuthenticated, async (req, res) => {
    if (!req.query.resource || !req.query.amount) return res.redirect('/store?err=MISSINGPARAMS');
    
    // Ensure amount is a number and is below 10
    if (isNaN(req.query.amount) || req.query.amount > 10) return res.redirect('/store?err=INVALIDAMOUNT');

    // Ensure resource is a valid one
    if (req.query.resource != 'cpu' && req.query.resource != 'ram' && req.query.resource != 'disk') return res.redirect('/store?err=INVALIDRESOURCE');

    let coins = await db.get(`coins-${req.user.email}`);
    let currentResources = await db.get(`${req.query.resource}-${req.user.email}`);

    // Resource amounts & costs
    if (req.query.resource == 'cpu') {
        let resourceAmount = 100 * req.query.amount;
        let resourceCost = resourceCosts.cpu * req.query.amount;

        if (coins < resourceCost) return res.redirect('/store?err=NOTENOUGHCOINS');
        await db.set(`cpu-${req.user.email}`, parseInt(currentResources) + parseInt(resourceAmount));
        await db.set(`coins-${req.user.email}`, parseInt(coins) - parseInt(resourceCost));
        return res.redirect('/store?success=BOUGHTRESOURCE');
    } else if (req.query.resource == 'ram') {
        let resourceAmount = 1024 * req.query.amount;
        let resourceCost = resourceCosts.ram * req.query.amount;

        if (coins < resourceCost) return res.redirect('/store?err=NOTENOUGHCOINS');
        await db.set(`ram-${req.user.email}`, parseInt(currentResources) + parseInt(resourceAmount));
        await db.set(`coins-${req.user.email}`, parseInt(coins) - parseInt(resourceCost));
        return res.redirect('/store?success=BOUGHTRESOURCE');
    } else if (req.query.resource == 'disk') {
        let resourceAmount = 1024 * req.query.amount;
        let resourceCost = resourceCosts.disk * req.query.amount;

        if (coins < resourceCost) return res.redirect('/store?err=NOTENOUGHCOINS');
        await db.set(`disk-${req.user.email}`, parseInt(currentResources) + parseInt(resourceAmount));
        await db.set(`coins-${req.user.email}`, parseInt(coins) - parseInt(resourceCost));
        return res.redirect('/store?success=BOUGHTRESOURCE');
    }
});

router.post('/claim-promocode', async (req, res) => {
  const { code } = req.body;
  const email = req.user.email; // Assuming user's email is available

  if (!code || !email) {
      return res.status(400).json({ error: 'Code is required.' });
  }

  // Fetch promo code data from the database
  const promoData = await db.get(`code-${code}`);
  if (!promoData) {
      return res.status(404).json({ error: 'Invalid promo code.' });
  }

  // Check if the promo code has reached max uses
  if (promoData.uses >= promoData.maxUses) {
      return res.status(400).json({ error: 'Sorry, this code has reached the max limit.' });
  }

  // Check if the user has already claimed this promo code
  const claimedCodes = await db.get(`claimed_codes-${email}`) || [];
  
  // If the code has already been claimed, return an error
  if (claimedCodes.includes(code)) {
      return res.status(400).json({ error: 'You have already claimed this promo code.' });
  }

  // Increment the usage count
  await db.set(`code-${code}.uses`, promoData.uses + 1);

  // Prepare coins to add
  const coins = promoData.coins;

  // Add coins to the user's account
  try {
      // Get current coins or default to 0
      let currentCoins = parseInt(await db.get(`coins-${email}`)) || 0;

      // Calculate new amount
      let amountParse = currentCoins + parseInt(coins);

      // Update the user's coins in the database
      await db.set(`coins-${email}`, amountParse);

      // Update the claimed codes for the user
      claimedCodes.push(code);
      await db.set(`claimed_codes-${email}`, claimedCodes);

      // Respond with success message and new amount
      res.status(200).json({ message: 'Promo code claimed successfully!', newAmount: amountParse });
  } catch (error) {
      res.status(500).json({ error: 'Failed to Add Coins', details: error.message });
  }
});

// Buy plan
router.get('/buyplan', ensureAuthenticated, async (req, res) => {
    if (!req.query.plan) return res.redirect('/upgrade?err=MISSINGPARAMS');

    const planId = parseInt(req.query.plan);
    if (isNaN(planId)) return res.redirect('/upgrade?err=INVALIDPLAN');

    // Filter
    let selectedPlan = null;
    let selectedPlanName = '';
    for (const key in plans.PLAN) {
        if (plans.PLAN[key].id === planId) {
            selectedPlan = plans.PLAN[key];
            selectedPlanName = key.toUpperCase();
            break;
        }
    }

    // Ensure plan is a valid one
    if (!selectedPlan) return res.redirect('/upgrade?err=INVALIDPLAN');

    let coins = await db.get(`coins-${req.user.email}`);
    let currentPlan = await db.get(`plan-${req.user.email}`);

    // Plan costs
    let planCost = selectedPlan.price;
    if (coins < planCost) return res.redirect('/upgrade?err=NOTENOUGHCOINS');
    if (currentPlan == selectedPlanName) return res.redirect('/upgrade?err=ALREADYPLAN');

    try {
        await db.set(`plan-${req.user.email}`, selectedPlanName);
        await db.set(`coins-${req.user.email}`, parseInt(coins) - parseInt(planCost));

        // Set resources of plan
        const resources = selectedPlan.resources;
        for (const resource in resources) {
            await db.set(`${resource}-${req.user.email}`, resources[resource]);
        }
        return res.redirect('/upgrade?success=BOUGHTPLAN');
    } catch (error) {
        console.error('Error buying plan:', error);
        return res.redirect('/upgrade?err=INTERNALERROR');
    }
});

module.exports = router;