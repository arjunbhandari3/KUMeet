const nodemailer = require("nodemailer")
const crypto = require("crypto");
const helper = require("../helpers/helper");
var token = crypto.randomBytes(16).toString('hex')

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
    },
    // isNotVerified: function (req, res, next) {
    //     try {
    //         const user = User.findOne({
    //             email: req.user.email
    //         });
    //         if (user.isVerified) {
    //             return next();
    //         }
    //         req.flash("error", "Your account hasn't been verified. Please Verify.")
    //         return res.redirect('/');
    //     } catch (err) {
    //         console.log(err)
    //         req.flash("error", "Something went wrong. Please try again")
    //         return res.redirect('/');
    //     }
    // }
}