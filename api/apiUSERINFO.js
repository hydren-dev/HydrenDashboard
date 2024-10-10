const express = require('express');
const Keyv = require('keyv');
require('dotenv').config(); 

const router = express.Router();

const keyv = new Keyv('sqlite://storage/database.sqlite'); 

function authenticate(req, res, next) {
    const apiKey = req.query.key;
    if (apiKey && apiKey === process.env.API_KEY) {
        next();
    } else {
        res.status(403).json({ error: "Forbidden: Invalid API Key" });
    }
}

async function getUserInfo(email) {
    const keys = {
        cpu: `cpu-${email}`,
        ram: `ram-${email}`,
        disk: `disk-${email}`,
        server: `server-${email}`,
        id: `id-${email}`,
    };

    const data = {};
    for (const [key, value] of Object.entries(keys)) {
        data[key] = await keyv.get(value);
    }

    return data;
}

router.get('/application/user/info', authenticate, async (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
    }

    try {
        const userInfo = await getUserInfo(email);
        res.json({ email, ...userInfo });
    } catch (error) {
        res.status(500).json({ error: "Query execution failed", details: error.message });
    }
});

module.exports = router;
