const express = require('express');
const session = require('express-session');
const fs = require('fs');
const CatLoggr = require('cat-loggr');
const passport = require('passport');
const ejs = require('ejs');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const ipaddr = require('ipaddr.js');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
const expressWs = require('express-ws')(app);

const { db } = require('./function/db');

const log = new CatLoggr();

const apiRouter = require('./app/apirouter');

log.init = (message) => {
  process.stdout.write(`${chalk.gray(message)}\n`);
};
log.error = (message) => {
  process.stdout.write(`${chalk.gray('master | ')} ${message}\n`);
};
log.warn = (message) => {
  process.stdout.write(`${chalk.gray('master | ')} ${message}\n`);
};
console.info = (message) => {
  process.stdout.write(`${chalk.gray(message)}\n`);
};

// Read the ASCII art from the file
const ascii = fs.readFileSync('./function/ascii.txt', 'utf8');

// Function to format ASCII art with the master | prefix
const formatAsciiArt = (asciiArt) => {
    const prefix = chalk.gray('master | ');
    return asciiArt
        .split('\n')
        .map(line => prefix + chalk.white(line))
        .join('\n');
};

// Display the ASCII art with the prefix
log.init(formatAsciiArt(ascii) + chalk.white(`${process.env.APP_VERSION}\n`));

// Function to send a Discord notification
async function sendDiscordNotification(message) {
  const webhookURL = process.env.DISCORD_WEBHOOK_URL;
  const notificationsEnabled = process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true';

  if (!notificationsEnabled) {
    log.warn('❗ Discord notifications are disabled.');
    return;
  }

  if (!webhookURL) {
    log.error('Discord webhook URL is not set.');
    process.exit(1)
  }

  const embed = {
    title: 'Server Notification',
    description: message,
    color: 3066993, // Green color
    thumbnail: {
      url: process.env.EMBED_THUMBNAIL_URL || 'https://example.com/default-thumbnail.png' // Default thumbnail URL
    },
    timestamp: new Date().toISOString(),
  };

  const data = {
    username: 'Panel Data',
    embeds: [embed],
  };

  try {
    await axios.post(webhookURL, data);
    log.info('✅ Notification sent to Discord successfully.');
  } catch (error) {
    log.error(`❗ Error sending notification to Discord: ${error.message} | Error Code - 607`);
  }
}
require('./function/console');
require('./function/skyport');

const init = async () => {

  if (process.env.CODESPACES || process.env.CODESPACE_NAME) {
    console.error('HydrenDashboard does not support running on GitHub Codespaces.');
    process.exit(1); // Exit the process with an error code
}

  if (process.env.ADMIN_USERS) {
    const admins = process.env.ADMIN_USERS.split(',');
    admins.forEach(admin => db.set(`admin-${admin}`, true));
  } else {
    log.error('No admin users defined. Skipping admin user creation.');
  }

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '/resources'));


  app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(requestIp.mw());

  app.use(async (req, res, next) => {
    const ipAddress = req.clientIp;
 
    if (!ipaddr.isValid(ipAddress)) {
      log.error(`Invalid IP Address: ${ipAddress}`);
      return res.status(400).json('Invalid IP address format.');
    }

    const userIp = ipaddr.process(ipAddress).toString();
    const proxycheckKey = process.env.PROXYCHECK_KEY;

    try {
      const proxyResponse = await axios.get(`http://proxycheck.io/v2/${userIp}?key=${proxycheckKey}`);
      const proxyData = proxyResponse.data;

      if (proxyData[userIp] && proxyData[userIp].proxy === 'yes') {
        return res.status(403).json('Proxy/VPN detected. Please turn it off to continue.');
      }
    } catch (error) {
      console.error('Error checking proxy:', error);
      return res.status(500).json('Error checking proxy.');
    }

    next();
  });

  app.use('/api', apiRouter);

  const allRoutes = fs.readdirSync('./app');
  allRoutes.forEach(routeFile => {
    const route = require(`./app/${routeFile}`);
    expressWs.applyTo(route);
    app.use('/', route);
  });
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res) => {
    res.status(404).render('404');
  });

  const port = process.env.APP_PORT || 3000;
  app.listen(port, async () => {
    const appUrl = process.env.APP_URL || `http://localhost:${port}`;
    log.warn(`✅ HydrenDashboard has been started on ${appUrl}:${process.env.APP_PORT}!`);

    // Send Discord notification that the server has started
    await sendDiscordNotification(`✅ ${process.env.APP_NAME} has started.`);
  });
}; 

init().catch(err => {
  log.error('🛑 Failed to start the application | Error Code - 405:', err);
});
