const { db } = require('./db');

async function checkPassword(email) {
    let password = await db.get(`password-${email}`);
    return password;
};

module.exports = { checkPassword }