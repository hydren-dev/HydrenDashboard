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
      await db.set(`id-${email}`, response.data.userId);
      return;
    } catch (err) {
      // If user does not exist, proceed to create
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

router.get('/callback', (req, res) => {
  const code = req.query.code;

  if (code) {
    res.send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
        <style>
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          #splashText {
            animation: slideDown 0.3s ease-out;
            overflow: hidden;
            white-space: nowrap;
          }
        </style>
      </head>
      <body class="bg-[#10181e] flex flex-col items-center justify-center min-h-screen">
        <div class="flex flex-col items-center">
          <img src="../public/spinner.png" class="h-10 w-10 animate-spin">
          <span id="splashText" style="font-family: 'Space Grotesk'" class="mt-6 uppercase text-zinc-400/50 text-sm tracking-widest">...</span>
        </div>
        <script>
          var splashTexts = ["Inventing new colors for the rainbow.", "Calculating the meaning of life."];
          function updateSplashText() {
            var randomIndex = Math.floor(Math.random() * splashTexts.length);
            var splashText = splashTexts[randomIndex];
            var splashElement = document.getElementById("splashText");
            splashElement.style.animation = 'none';
            splashElement.offsetHeight;
            splashElement.style.animation = 'slideDown 0.3s ease-out';
            splashElement.textContent = splashText;
          }
          setInterval(updateSplashText, 1000);
          updateSplashText();
        </script>
        <script type="text/javascript" defer>
          history.pushState('/login/discord', 'Logging in...', '/login/discord');
          window.location.replace('/callback/discord?code=${encodeURIComponent(code.replace(/'/g, ""))}');
        </script>
      </body>
      </html>
    `);
  } else {
    res.redirect('/login/discord'); // Redirect to login if 'code' is missing
  }
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
