const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const { db } = require('../function/db.js');
const { ensureAuthenticated } = require('../function/ensureAuthenticated.js');
const { checkPassword } = require('../function/checkPassword.js');
const { calculateResource } = require('../function/calculateResource.js');

const router = express.Router();

const skyport = {
  url: process.env.SKYPORT_URL,
  key: process.env.SKYPORT_KEY
};

// Load plans
let plans = {};
try {
  const data = fs.readFileSync('./storage/plans.json', 'utf8');
  plans = JSON.parse(data).PLAN;
} catch (err) {
  console.error("Failed to load plans:", err);
  process.exit(1);
}

// Resources
async function getUserPlan(email) {
  let plan = await db.get(`plan-${email}`);
  if (!plan) {
    plan = `${process.env.DEFAULT_PLAN}`; // Default plan
    await db.set(`plan-${email}`, plan);
  }
  return plan.toUpperCase();
};

// Existing resources (the ones in use on servers)
const existingResources = async (userID) => {
  return {
    "cpu": await calculateResource(userID, 'Cpu'),
    "ram": await calculateResource(userID, 'Memory'),
    "disk": await calculateResource(userID, 'Disk') // D
  };
};
  
// Max resources (the ones the user has purchased or been given)
const maxResources = async (email) => {
  return {
    "cpu": await db.get(`cpu-${email}`),
    "ram": await db.get(`ram-${email}`),
    "disk": await db.get(`disk-${email}`),
    "server": await db.get(`server-${email}`)
  };
};

// Set default resources
async function ensureResourcesExist(email) {
    const planKey = await getUserPlan(email);
    const plan = plans[planKey].resources;
    const resources = await maxResources(email);

    if (!resources.cpu || resources.cpu == 0) {
        await db.set(`cpu-${email}`, plan.cpu);
    }

    if (!resources.ram || resources.ram == 0) {
        await db.set(`ram-${email}`, plan.ram);
    }

    if (!resources.disk || resources.disk == 0) {
        await db.set(`disk-${email}`, plan.disk);
    }

    if (!resources.server || resources.server == 0) {
      await db.set(`server-${email}`, plan.server);
    }

    // Might as well add the coins too instead of having 2 separate functions
    if (!await db.get(`coins-${email}` || 0)) {
        await db.set(`coins-${email}`, 0.00);
    }
};

// Pages / Routes
router.get('/', (req, res) => {
  res.render('index', {
    req: req, // Requests (queries) 
    name: process.env.APP_NAME, // Dashboard name
    user: req.user, // User info (if logged in)
    discordserver: process.env.DISCORD_SERVER,
    theme: require('../storage/theme.json') // Theme data
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    try {
      const response = await axios.post(`${skyport.url}/api/getUserInstance`, {
        userId: req.user.id
      }, {
        headers: {
          'x-api-key': skyport.key
        }
      });

      const servers = response.data || [];
  
      // Ensure all resources are set to 0 if they don't exist
      await ensureResourcesExist(req.user.email);

      // Calculate existing and maximum resources
      const existing = await existingResources(req.user.id);
      const max = await maxResources(req.user.email);
  
      res.render('dashboard', { 
        coins: await db.get(`coins-${req.user.email}`) || 0, // User's coins
        req: req, // Request (queries)
        name: process.env.APP_NAME || "HydrenDashboard", // Dashboard name
        user: req.user, // User info
        servers, // Servers the user owns
        discordserver: process.env.DISCORD_SERVER,
        existing, // Existing resources
        max, // Max resources,
        theme: require('../storage/theme.json'), // Theme data
        admin: await db.get(`admin-${req.user.email}`) || false // Admin status
      });
    } catch (err) {
      res.redirect('/?err=INTERNALERROR');
    }
  } catch (err) {
    res.redirect('/?err=INTERNALERROR');
  }
});

router.get('/servers', ensureAuthenticated, async (req, res) => {
  try {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    try {
      const response = await axios.post(`${skyport.url}/api/getUserInstance`, {
        userId: req.user.id
      }, {
        headers: {
          'x-api-key': skyport.key
        }
      });

      const servers = response.data || [];
      console.log("")
  
      // Ensure all resources are set to 0 if they don't exist
      await ensureResourcesExist(req.user.email);
      console.log("");
  
      // Calculate existing and maximum resources
      const existing = await existingResources(req.user.id);
      const max = await maxResources(req.user.email);
  
      res.render('servers', { 
        coins: await db.get(`coins-${req.user.email}`) || 0, // User's coins
        req: req, // Request (queries)
        name: process.env.APP_NAME || "HydrenDashboard", // Dashboard name
        user: req.user, // User info
        panel: process.env.SKYPORT_URL, // User info
        servers, // Servers the user owns
        existing, // Existing resources
        theme: require('../storage/theme.json'), // Theme data
        discordserver: process.env.DISCORD_SERVER,
        max, // Max resources,
        admin: await db.get(`admin-${req.user.email}`) || false,
        images: require('../storage/images.json'), // Images data
        nodes: require('../storage/nodes.json') // Nodes data
      });
    } catch (err) {
      res.redirect('/?err=INTERNALERROR');
    }
  } catch (err) {
    res.redirect('/?err=INTERNALERROR');
  }
});

// Credentials
router.get('/credentials', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
  res.render('credentials', { 
    coins: await db.get(`coins-${req.user.email}`), // User's coins
    req: req, // Request (queries)
    name: process.env.APP_NAME, // Dashboard name
    discordserver: process.env.DISCORD_SERVER,
    theme: require('../storage/theme.json'), // Theme data
    user: req.user, // User info
    admin: await db.get(`admin-${req.user.email}`), // Admin status
    password: await checkPassword(req.user.email) // Account password
  }) 
});

router.get('/news', ensureAuthenticated, async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
  res.render('announcment', { 
    coins: await db.get(`coins-${req.user.email}`), // User's coins
    req: req, // Request (queries)
    name: process.env.APP_NAME, // Dashboard name
    discordserver: process.env.DISCORD_SERVER,
    theme: require('../storage/theme.json'), // Theme data
    announcements: require('../storage/announcement.json'),
    user: req.user, // User info
    admin: await db.get(`admin-${req.user.email}`), // Admin status
    password: await checkPassword(req.user.email) // Account password
  }) 
});

router.get('/ref', ensureAuthenticated, async (req, res) => {
  res.render('ref', { 
    name: process.env.APP_NAME, // Dashboard name
  }) 
});

router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    try {
      const response = await axios.post(`${skyport.url}/api/getUserInstance`, {
        userId: req.user.id,
        discordserver: process.env.DISCORD_SERVER
      }, {
        headers: {
          'x-api-key': skyport.key
        }
      });

      const servers = response.data || [];
  
      // Ensure all resources are set to 0 if they don't exist
      await ensureResourcesExist(req.user.email);
      console.log("");
  
      // Calculate existing and maximum resources
      const existing = await existingResources(req.user.id);
      const max = await maxResources(req.user.email);
  
      res.render('profile', { 
        coins: await db.get(`coins-${req.user.email}`) || 0, // User's coins
        req: req, // Request (queries)
        name: process.env.APP_NAME || "HydrenDashboard", // Dashboard name
        discordserver: process.env.DISCORD_SERVER,
        user: req.user, // User info
        servers, // Servers the user owns
        existing, // Existing resources
        theme: require('../storage/theme.json'), // Theme data
        max, // Max resources,
        admin: await db.get(`admin-${req.user.email}`) || false // Admin status
      });
    } catch (err) {
      res.redirect('/?err=INTERNALERROR');
    }
  } catch (err) {
    res.redirect('/?err=INTERNALERROR');
  }
});

// Panel
router.get('/panel', (req, res) => {
  res.redirect(`${skyport.url}/login`);
});

const storageDir = path.join(__dirname, '../storage');


router.get('/get/set-theme', (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
  
  // Get the selected theme from query parameters
  const selectedTheme = req.query.theme; // Accessing the theme from the query
  let themeConfig;

  if (selectedTheme === 'blue') {
    themeConfig = {
        "textcolor": "white",
        "buttoncolor": "blue",
        "somecolors": "blue"
    };
} else if (selectedTheme === 'purple') {
    themeConfig = {
        "textcolor": "white",
        "buttoncolor": "purple",
        "somecolors": "purple"
    };
} else if (selectedTheme === 'orange') {
    themeConfig = {
        "textcolor": "white",
        "buttoncolor": "orange",
        "somecolors": "orange"
    };
} else {
    themeConfig = {
        "textcolor": "white",
        "buttoncolor": "[#0a9875]",
        "somecolors": "[#0a9875]"
    };
}



  // Create the storage directory if it doesn't exist
  if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir);
  }

  // Write the theme configuration to theme.json
  const themePath = path.join(storageDir, 'theme.json');
  fs.writeFileSync(themePath, JSON.stringify(themeConfig, null, 2));

  // Redirect with a success message
  res.redirect('../theme?err=RESTART YOUR DASH TO TAKE EFFECT');
});

// Assets
router.use('/public', express.static('public'));

module.exports = router;