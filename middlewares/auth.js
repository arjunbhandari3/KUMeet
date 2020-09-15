module.exports = {
    ensureAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        } else {
            req.flash('error', 'Authentication Failed!. Please Sign In.');
            req.session.oldUrl = req.originalUrl;
            res.redirect('/signin')
        }
    },
    ensureGuest: function (req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        } else {
            res.redirect('/');
        }
    }
}