const { db } = require('./db');

async function checkPassword(email) {
    try {
        let password = await db.get(`password-${email}`);
        return password;
    } catch (error) {
        console.error(`Error retrieving password for email ${email}:`, error);
        throw error; // Optionally, rethrow the error for further handling
    }
};

module.exports = { checkPassword }