const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord');
const axios = require('axios');
const fs = require('fs');
const randomstring = require("randomstring");
const router = express.Router();

const { db } = require('../function/db');

const skyport = {
  url: process.env.SKYPORT_URL,
  key: process.env.SKYPORT_KEY
};

// Configure passport to use Discord
const discordStrategy = new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
});

// Skyport account system
async function checkAccount(email, username, id) {
  try {
    const type = 'email';

    // Check if user already exists in Skyport
    let response;
    try {
      response = await axios.post(`${skyport.url}/api/getUser`, {
        type,
        value: email
      }, {
        headers: {
          'x-api-key': skyport.key,
          'Content-Type': 'application/json'
        }
      });

      // User already exists, log and return
      console.log('User already exists in Skyport. User ID:', response.data.userId);
      await db.set(`id-${email}`, response.data.userId);
      return;
    } catch (err) {
      // If user does not exist, proceed to create
      console.log('User does not exist in Skyport. Creating user...');
    }

    // Generate a random password for new user
    const password = randomstring.generate({ length: process.env.PASSWORD_LENGTH });

    // Create user in Skyport
    try {
      response = await axios.post(`${skyport.url}/api/users/create`, {
        username,
        email,
        password,
        userId: id
      }, {
        headers: {
          'x-api-key': skyport.key,
          'Content-Type': 'application/json'
        }
      });

      // Log creation and set password in database
      console.log('User created in Skyport. User ID:', response.data.userId);
      await db.set(`password-${email}`, password);
      await db.set(`id-${email}`, response.data.userId);
      fs.appendFile(process.env.LOGS_PATH, '[LOG] User created in Skyport.\n', (err) => {
        if (err) console.log(`Failed to save log: ${err}`);
      });
    } catch (err) {
      // Handle conflict error (409) when user already exists
      if (err.response && err.response.status === 409) {
        console.log('User creation conflict: User already exists in Skyport.');
        return;
      } else {
        console.error('Failed to create user in Skyport:', err.message);
        fs.appendFile(process.env.LOGS_ERROR_PATH, '[ERROR] Failed to create user in Skyport.\n', (err) => {
          if (err) console.log(`Failed to save log: ${err}`);
        });
        throw err;
      }
    }
  } catch (error) {
    console.error('Error during account check:', error.message);
    fs.appendFile(process.env.LOGS_ERROR_PATH, '[ERROR] Failed to check user account.\n', (err) => {
      if (err) console.log(`Failed to save log: ${err}`);
    });
    throw error;
  }
}

passport.use(discordStrategy);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Discord routes
router.get('/login/discord', passport.authenticate('discord'), (req, res) => {
  res.redirect('/');
});

router.get('/callback/discord', passport.authenticate('discord', {
  failureRedirect: '/login'
}), (req, res) => {
  checkAccount(req.user.email, req.user.username, req.user.id)
    .then(() => {
      res.redirect(req.session.returnTo || '/dashboard');
    })
    .catch(error => {
      console.error('Error during account check:', error.message);
      fs.appendFile(process.env.LOGS_ERROR_PATH, '[ERROR] Error during account check.\n', (err) => {
        if (err) console.log(`Failed to save log: ${err}`);
      });
      res.redirect('/dashboard');
    });
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      fs.appendFile(process.env.LOGS_ERROR_PATH, `[ERROR] Logout failed: ${err.message}\n`, (logErr) => {
        if (logErr) console.log(`Failed to save log: ${logErr}`);
      });
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

module.exports = router;
