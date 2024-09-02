const express = require('express');
const router = express.Router();
const axios = require('axios');

const { db } = require('../function/db.js');
const { ensureAuthenticated } = require('../function/ensureAuthenticated.js');
const { checkPassword } = require('../function/checkPassword.js');
const { calculateResource } = require('../function/calculateResource.js');

// Route to render the lv.ejs view
router.get('/lv', ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.email || !req.user.id) return res.redirect('/login/discord');
    res.render('lv', { 
      coins: await db.get(`coins-${req.user.email}`), // User's coins
      coins_lv: process.env.DEFAULT_LV_COINS,
      req: req, // Request (queries)
      name: process.env.APP_NAME, // Dashboard name
      discordserver: process.env.DISCORD_SERVER,
      user: req.user, // User info
      admin: await db.get(`admin-${req.user.email}`), // Admin status
      password: await checkPassword(req.user.email) // Account password
    }) 
  });

// Route to redirect to the generated Linkvertise URL
router.get('/lv/generate', (req, res) => {
    const generatedUrl = `${process.env.LINKVERTISE_URL}`;
    res.redirect(generatedUrl);
});

// Route to display email input form for claim
router.get('/lv/claim', (req, res) => {
    res.send(`
        <form action="/lv/claim/submit" method="post">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
            <button type="submit">Submit</button>
        </form>
    `);
});

// Route to handle the submission and add coins
router.post('/lv/claim/submit', async (req, res) => {
    const { email } = req.body;
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Code is required');
    }


    try {
        // Make a request to add coins using the provided API key, email, and default coins
        const response = await axios.get(`${process.env.DASH_URL}/api/addcoins`, {
            params: {
                key: process.env.API_KEY,
                email: email,
                coins: process.env.DEFAULT_LV_COINS
            }
        });

        // Send a success response
        res.redirect('/lv?err=none')
    } catch (error) {
        res.status(500).send('Error claiming the Linkvertise code');
    }
});

module.exports = router;
