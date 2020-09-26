const router = require("express").Router();
const helper = require("../helpers/helper");
const Meeting = require("../models/meeting");
const {
    google
} = require('googleapis')

const {
    OAuth2
} = google.auth
const {
    addWeeks
} = require('date-fns')
const credentials = require('../public/credentials.json')

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
    ensureAuth
} = require("../middlewares/auth");


// // @desc    Join Meeting
// // @route   GET /join-meeting
router.get("/join-meeting", ensureAuth, (req, res, next) => {
    try {
        res.render("join_meeting", {
            layout: "main",
            page: "Join Meeting",
            customCSS: "logreg",
            csrfToken: req.csrfToken(),
        });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

router.post(
    "/join-meeting",
    csrfProtection,
    [
        check("room_code")
        .notEmpty()
        .withMessage("Code is required."),
        check("password")
        .notEmpty()
        .withMessage("Password is required.")
    ],
    (req, res, next) => {
        const {
            room_code,
            password
        } = req.body;
        // Check validation.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            errors.array().forEach((err) => req.flash("errors", err.msg));
            return res.redirect("/join-meeting");
        } else {
            Meeting.findOne({
                    room_code
                },
                function (err, meeting) {
                    if (err) throw err;
                    if (!meeting) {
                        req.flash("error", "Couldn't find the meeting you are trying to join. Please try again.");
                        return res.redirect("/join-meeting");
                    } else if (meeting.password && !meeting.validPassword(password)) {
                        req.flash("error", "Incorrect Password");
                        return res.redirect("/join-meeting");
                    } else {
                        req.flash("success", "You joined the meeting sucessfully.");
                        return res.redirect(`/meeting?room=${room_code}&pwd=${password}`);
                    }
                },
            );
        }
    }
);

// // @desc    Instant Meeting
// // @route   GET /instant-meeting
router.get('/instant-meeting', ensureAuth, function (req, res) {
    res.render("instant_meeting", {
        layout: "main",
        page: "Instant Meeting",
        customCSS: "logreg",
        csrfToken: req.csrfToken(),
    });
});

router.post(
    "/instant-meeting",
    csrfProtection,
    [
        check("room_name")
        .notEmpty()
        .withMessage("Room Name is required.")
    ],
    (req, res, next) => {
        // Check validation.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            errors.array().forEach((err) => req.flash("errors", err.msg));
            return res.redirect("/instant-meeting");
        } else {
            const room_code = helper.generateRandomString();
            const password = helper.generateRandomPassword();
            Meeting.findOne({
                    room_code
                },
                function (err, meeting) {
                    if (err) {
                        throw err;
                    } else if (!meeting) {
                        var newMeeting = new Meeting();
                        newMeeting.room_name = req.body.room_name;
                        newMeeting.room_code = room_code;
                        newMeeting.password = newMeeting.encryptPassword(password);
                        newMeeting.owner = req.user;
                        newMeeting.save((err) => {
                            if (err) throw err;
                            req.flash("success", "You have created the meeting sucessfully.");
                            return res.redirect(`/meeting?room=${room_code}&pwd=${password}`);
                        });
                    } else {
                        req.flash("error", "Meeting cannot be created, Try Again.");
                        return res.redirect("/instant-meeting");
                    }
                }
            );
        }
    }
);

// @desc    Schedule Meeting
// @route   GET /schedule-meeting
router.get('/schedule-meeting', ensureAuth, function (req, res) {
    res.render("schedule_meeting", {
        layout: "main",
        page: "Schedule Meeting",
        customCSS: "logreg",
        csrfToken: req.csrfToken(),
    });
});

router.post(
    "/schedule-meeting",
    csrfProtection,
    [
        check("room_name")
        .notEmpty()
        .withMessage("Room Name is required."),
        check('meeting_date')
        .trim()
        .isDate()
        .withMessage('Must be a valid date')
        .custom(value => {
            let enteredDate = new Date(value);
            let todaysDate = new Date();
            if (enteredDate > todaysDate) {
                throw new Error("Invalid Date");
            }
            return true;
        }),
        check("start_time")
        .custom((value, {
            req
        }) => {
            if (value > req.body.end_time) {
                throw new Error("Invalid Time");
            } else {
                return value;
            }
        }),
    ],
    (req, res, next) => {
        // Check validation.
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            errors.array().forEach((err) => req.flash("errors", err.msg));
            return res.redirect("/schedule-meeting");
        } else {
            const room_code = helper.generateRandomString();
            const password = helper.generateRandomPassword();
            Meeting.findOne({
                    room_code
                },
                function (err, meeting) {
                    if (err) {
                        throw err;
                    } else if (!meeting) {
                        var newMeeting = new Meeting();
                        newMeeting.room_name = req.body.room_name;
                        newMeeting.room_code = room_code;
                        newMeeting.password = newMeeting.encryptPassword(password);
                        newMeeting.meeting_date = req.body.meeting_date;
                        newMeeting.start_time = req.body.start_time;
                        newMeeting.end_time = req.body.end_time;
                        newMeeting.owner = req.user;
                        newMeeting.save((err) => {
                            if (err) throw err;
                            req.flash("success", "You have scheduled the meeting sucessfully.");
                            return res.redirect(`/`);
                        });
                    } else {
                        req.flash("error", "Meeting cannot be created, Try Again.");
                        return res.redirect("/instant-meeting");
                    }
                }
            );
        }
    }
);
// // @desc    Meeting
// // @route   GET /:path
router.get("/meeting", ensureAuth, (req, res, next) => {
    try {
        Meeting.findOne({
                room_code: req.query.room
            },
            function (err, meeting) {
                if (err) {
                    throw err;
                } else if (meeting) {
                    req.flash("success", "You have joined the meeting.");
                    res.render("meeting", {
                        layout: "meeting",
                        page: meeting.room_name,
                        user: req.user,
                        meeting: meeting
                    });
                } else {
                    req.flash("error", "Couldn't find the meeting you are trying to join. Please try again.");
                    return res.redirect("/join-meeting");
                }
            },
        );
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

module.exports = router;