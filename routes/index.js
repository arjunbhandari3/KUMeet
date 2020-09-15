const router = require("express").Router();
const {
    ensureGuest,
    ensureAuth
} = require("../middlewares/auth");

// @desc    Landing page
// @route   GET /
router.get("/", (req, res) => {
    res.render("index", {
        layout: "main",
        page: "Home",
    });
});

// // @desc    Profile
// // @route   GET /profile
router.get("/profile", ensureAuth, async (req, res, next) => {
    try {
        res.render("profile", {
            layout: "main",
            page: "Profile"
        });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

module.exports = router;