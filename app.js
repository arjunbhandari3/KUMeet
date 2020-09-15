const path = require("path"),
    express = require("express"),
    mongoose = require("mongoose"),
    dotenv = require("dotenv"),
    morgan = require("morgan"),
    cookieParser = require("cookie-parser"),
    exphbs = require("express-handlebars"),
    createError = require("http-errors"),
    methodOverride = require("method-override"),
    passport = require("passport"),
    session = require("express-session"),
    MongoStore = require("connect-mongo")(session),
    flash = require("connect-flash"),
    connectDB = require("./config/db"),
    csrf = require("csurf");

// Load config
dotenv.config({
    path: "./config/config.env",
});

// Passport config
require("./config/passport");

//database
connectDB();

const app = express();
const server = require("http").Server(app);
const io = require('socket.io')(server);
const stream = require('./config/stream');

// Body parser
app.use(
    express.urlencoded({
        extended: false,
    })
);
app.use(express.json());

// Method override
app.use(
    methodOverride(function (req, res) {
        if (req.body && typeof req.body === "object" && "_method" in req.body) {
            // look in urlencoded POST bodies and delete it
            let method = req.body._method;
            delete req.body._method;
            return method;
        }
    })
);

app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// Handlebars
app.engine(
    ".hbs",
    exphbs({
        defaultLayout: "main",
        extname: ".hbs",
    })
);

app.set("view engine", ".hbs");

// Sessions
app.use(
    session({
        secret: process.env.secret,
        resave: false,
        saveUninitialized: true,
        store: new MongoStore({
            mongooseConnection: mongoose.connection,
        }),
        cookie: {
            httpOnly: true,
            maxAge: 2419200000,
        },
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CSRF Protection
const csrfProtection = csrf({
    cookie: true,
});
app.use(csrfProtection);

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.user = req.user || null;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.errors = req.flash("errors");

    next();
});

// Static folder
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", require("./routes/index"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/meeting"));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render("error");
});


io.of('/stream').on('connection', stream);

const PORT = process.env.PORT || 3000;

server.listen(
    PORT,
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    )
);