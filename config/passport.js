const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User");

// LOCAL
passport.use(
    "local.signup",
    new LocalStrategy({
            usernameField: "email",
            passwordField: "password",
            passReqToCallback: true,
        },
        (req, email, password, done) => {
            if (!req.user) {
                User.findOne({
                        email: email
                    },
                    function (err, user) {
                        console.log(user)
                        if (err) {
                            return done(err);
                        } else if (user && !user.password) {
                            user.password = user.encryptPassword(password);
                            user.save((err) => {
                                if (err) throw err;
                                return done(null, user);
                            });
                        } else if (user && user.email) {
                            return done(null, false, req.flash("error", "Email already Exists."));
                        } else {
                            var newUser = new User();
                            newUser.email = email;
                            newUser.password = newUser.encryptPassword(password);
                            newUser.full_name = req.body.full_name;
                            newUser.save((err) => {
                                if (err) {
                                    return done(err);
                                }
                                return done(null, newUser);
                            });
                        }
                    });
            } else {
                return done(null, req.user);
            }
        }
    )
);

passport.use(
    "local.signin",
    new LocalStrategy({
            usernameField: "email",
            passwordField: "password",
            passReqToCallback: true,
        },
        (req, email, password, done) => {
            User.findOne({
                    email: email
                },
                (err, user) => {
                    if (err) {
                        return done(err);
                    } else if (!user || !user.password) {
                        return done(null, false, req.flash("error", "Not registered. Please Sign Up."));
                    } else if (user.password && !user.validPassword(password)) {
                        return done(null, false, req.flash("error", "Incorrect Password"));
                    } else {
                        return done(null, user);
                    }
                }
            );
        }
    )
);

// GOOGLE
passport.use(
    new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            process.nextTick(function () {
                if (!req.user) {
                    User.findOne({
                            email: profile.emails[0].value
                        },
                        function (err, user) {
                            if (err) return done(err);
                            if (user) {
                                if (!user.token) {
                                    user.token = accessToken;
                                    user.full_name = profile.displayName;
                                    newUser.image = profile.photos[0].value;
                                    user.save(function (err) {
                                        if (err) throw err;
                                        return done(null, user);
                                    });
                                }

                                return done(null, user);
                            } else {
                                var newUser = new User();
                                newUser.id = profile.id;
                                newUser.token = accessToken;
                                newUser.full_name = profile.displayName;
                                newUser.email = profile.emails[0].value;
                                newUser.image = profile.photos[0].value;

                                newUser.save(function (err) {
                                    if (err) throw err;
                                    return done(null, newUser);
                                });
                            }
                        }
                    );
                } else {
                    var user = req.user;
                    user.token = accessToken;
                    user.full_name = profile.displayName;
                    user.image = profile.photos[0].value;

                    user.save(function (err) {
                        if (err) throw err;
                        return done(null, user);
                    });
                }
            });
        }
    )
);

// FACEBOOK
passport.use(
    new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: "/auth/facebook/callback",
            passReqToCallback: true,
            profileFields: ["id", "displayName", "name", "emails", "photos"],
        },
        function (req, accessToken, refreshToken, profile, done) {
            process.nextTick(function () {
                if (!req.user) {
                    User.findOne({
                            email: profile.emails[0].value || profile._json.email
                        },
                        function (err, user) {
                            if (err) return done(err);
                            if (user) {
                                if (!user.token) {
                                    user.token = accessToken;
                                    user.full_name =
                                        profile.name.givenName +
                                        " " +
                                        profile.name.familyName;
                                    user.image = profile.photos[0].value;

                                    user.save(function (err) {
                                        if (err) throw err;
                                        return done(null, user);
                                    });
                                }

                                return done(null, user);
                            } else {
                                var newUser = new User();

                                newUser.id = profile.id;
                                newUser.token = accessToken;
                                newUser.full_name =
                                    profile.name.givenName +
                                    " " +
                                    profile.name.familyName;
                                newUser.email =
                                    profile.emails[0].value ||
                                    profile._json.email;
                                newUser.image = profile.photos[0].value;
                                newUser.save(function (err) {
                                    if (err) throw err;
                                    return done(null, newUser);
                                });
                            }
                        }
                    );
                } else {
                    var user = req.user;
                    user.token = accessToken;
                    user.full_name =
                        profile.name.givenName + " " + profile.name.familyName;
                    user.image = profile.photos[0].value;

                    user.save(function (err) {
                        if (err) throw err;
                        return done(null, user);
                    });
                }
            });
        }
    )
);

passport.serializeUser((user, done) => {
    var sessionUser = {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        image: user.image
    }
    done(null, sessionUser)
});

passport.deserializeUser((sessionUser, done) => {
    done(null, sessionUser)
    // User.findById(sessionUser, (err, user) => done(err, user));
});