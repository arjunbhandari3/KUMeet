const router = require("express").Router();
const passport = require("passport");
const User = require("../models/User");
const csrf = require("csurf");
// CSRF Protection
const csrfProtection = csrf({
    cookie: true,
});
router.use(csrfProtection);

const {
    check,
    validationResult
} = require("express-validator");

const {
    ensureGuest,
    ensureAuth
} = require("../middlewares/auth");

// @desc   SIGN UP
// @route   GET /signup
router.get("/signup", ensureGuest, csrfProtection, (req, res) => {
    res.render("register", {
        layout: "main",
        page: "Sign Up",
        customCSS: "logreg",
        csrfToken: req.csrfToken(),
    });
});

// @desc    SIGN UP
// @route   POST /signup
router.post(
    "/signup",
    csrfProtection,
    [
        check("email")
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Email format is not correct."),
        check("password")
        .notEmpty()
        .withMessage("Password is required.")
        .matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/)
        .withMessage(
            "The password must have at least 8 characters, at least 1 digit(s), at least 1 lower case letter(s), at least 1 upper case letter(s)."
        )
        .trim()
        .custom((value, {
            req
        }) => {
            if (value !== req.body.password2) {
                throw new Error("Password don't match");
            } else {
                return value;
            }
        }),
        check("full_name")
        .notEmpty()
        .withMessage("Full Name is required.")
        .isLength({
            min: 3,
        })
        .withMessage("Full Name must be at least 3 characters.")
        .not()
        .isIn([" "])
        .withMessage("Please Complete your Full Name."),
    ],
    (req, res, next) => {
        // Check validation.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            errors.array().forEach((err) => req.flash("errors", err.msg));
            return res.redirect("/signup");
        }
        next();
    },
    passport.authenticate("local.signup", {
        failureRedirect: "/signup",
        failureFlash: true
    }),
    (req, res, next) => {
        var oldUrl = req.session.oldUrl || "/";
        delete req.session.oldUrl;
        req.flash("success", "Logged In Successfully.")
        res.redirect(oldUrl);
    }
);

// @desc    SIGN IN
// @route   GET /signin
router.get("/signin", ensureGuest, csrfProtection, (req, res) => {
    res.render("login", {
        layout: "main",
        page: "Sign In",
        customCSS: "logreg",
        csrfToken: req.csrfToken(),
    });
});

// @desc    SIGN IN
// @route   POST /signin
router.post(
    "/signin",
    csrfProtection,
    [
        check("email")
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Email format is not correct."),
        check("password")
        .notEmpty()
        .withMessage("Password is required.")
    ],
    (req, res, next) => {
        // Check validation.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            errors.array().forEach((err) => req.flash("errors", err.msg));
            return res.redirect("/signin");
        }
        next();
    },
    passport.authenticate("local.signin", {
        failureRedirect: "/signin",
        failureFlash: true,
    }),
    (req, res, next) => {
        var oldUrl = req.session.oldUrl || "/";
        delete req.session.oldUrl;
        req.flash("success", "Logged In Successfully.")
        res.redirect(oldUrl);
    }
);

// @desc    Auth with Google
// @route   GET auth/google
router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

// @desc    Google auth callback
// @route   GET auth/google/callback
router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/signin",
    }),
    (req, res) => {
        var oldUrl = req.session.oldUrl || "/";
        delete req.session.oldUrl;
        req.flash("success", "Logged In Successfully.")
        res.redirect(oldUrl);
    }
);

// @desc    Auth with Facebook
// @route   GET auth/facebook
router.get(
    "/auth/facebook",
    passport.authenticate("facebook", {
        scope: ["email", "public_profile"],
    })
);

// @desc    Google auth callback
// @route   GET auth/google/callback
router.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", {
        failureRedirect: "/signin",
    }),
    (req, res) => {
        var oldUrl = req.session.oldUrl || "/";
        delete req.session.oldUrl;
        req.flash("success", "Logged In Successfully.")
        res.redirect(oldUrl);
    }
);

router.get("/account/verify-email", ensureAuth, async function (req, res, next) {
    if (!req.query.token) throw "Token cannnot be null."
    try {
        const user = await User.findOne({
            verificationToken: req.query.token
        });
        if (!user) {
            req.flash('error', 'Token is INVALID. Please contact us for assistance.')
            res.redirect("/");
        }
        user.verificationToken = null;
        user.isVerified = true;
        await user.save();
        await req.logIn(user, async (err) => {
            if (err) return next(err);
            req.flash('success', `Welcome to KUMeet, ${user.full_name}`)
            var oldUrl = req.session.oldUrl || "/";
            delete req.session.oldUrl;
            res.redirect(oldUrl);
        })
    } catch (err) {
        console.log(err)
        req.flash("error", "Something went wrong. Please contact us for assistance.")
        var oldUrl = req.session.oldUrl || "/";
        delete req.session.oldUrl;
        res.redirect(oldUrl);
    }
});

// LOGOUT
router.get("/logout", ensureAuth, function (req, res, next) {
    req.flash("success", "Logged Out Successfully.")
    req.logout();
    res.redirect("/");
});

module.exports = router;