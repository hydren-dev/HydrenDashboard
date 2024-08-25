const { db } = require('./db');

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        // Check if the user is banned
        db.get(`banned-${req.user.email}`).then(reason => {
            if (reason) return res.redirect(`/?err=BANNED&reason=${encodeURIComponent(reason)}`);

            return next();
        }).catch(err => {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        });
    } else {
        req.session.returnTo = req.originalUrl;
        res.redirect('/');
    }
};

module.exports = { ensureAuthenticated }