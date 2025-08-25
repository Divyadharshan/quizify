require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const session = require("express-session");
const axios = require("axios");
const flash = require("connect-flash");
const ejsMate = require("ejs-mate");
const {transporter} = require("./mailconfig");
const multer = require("multer");
const { storage } = require("./cloudinary");
const upload = multer({ storage });

//Schemas
const User = require("./models/user");
const Quiz = require("./models/quiz");
const UserQuiz = require("./models/userquiz");

//Backend routes
const authroutes = require("./routes/authroutes");
const showroutes = require("./routes/showroutes");
const leaderboardroutes = require("./routes/leaderboard");
const attendquizroutes = require("./routes/attendquiz");
const generatequizroutes = require("./routes/generatequiz");
const createquizroutes = require("./routes/createquiz");
const attendingroutes = require("./routes/attending");
const typedquizroutes = require("./routes/typedquiz")
const usergeneratedroutes = require("./routes/usergenerate");
const followroutes = require("./routes/follow");
const profileroutes = require("./routes/profile");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const { isLoggedIn, isAuth } = require("./middleware");

mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection errror :"));
db.once("open", async () => {
    console.log("Database Connected");
})

app.use(express.json());
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"))

const sessionConfig = {
    name: process.env.SESSION_NAME,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365 //One year
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://quizify.azurewebsites.net/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                await user.save();
            } else {
                let username;
                let unique=false;
                while (!unique) {
                    const random = Math.floor(Math.random() * 10000);//Random number between 0-9999
                    const tusername = `quizzer${random}`;
                    const check = await User.findOne({ username: tusername });
                    if (!check) {
                        username = tusername;
                        unique = true;
                    }
                }
                user = new User({
                    username:username,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                });
                const mailOptions = {
                    from: process.env.EMAIL,
                    to: user.email,
                    subject: "🎉 Welcome to Quizify - Let the Quizzing Begin!",
                    text: `
Hi ${user.username},
        Welcome to Quizify! 🎯 We're thrilled to have you on board. Get ready to explore, create, and challenge yourself with exciting quizzes!
         🔥 Here's what you can do:
                ✅ Play quizzes on various topics 📚
                ✅ Challenge friends 1v1 with a timer and earn XPs! ⚔️⏱️
                ✅ Create your own quizzes & challenge friends 🎨
                ✅ Generate quizzes automatically with AI 🤖
                ✅ Take on the Daily Quiz & boost your score! 📅
                ✅ Climb the Leaderboard & compete with top players! 🏆
                ✅ Follow other users & see their quiz activity! 👥

🚀 Start your journey now and explore quizzes

Come back every day for a new quiz and stay ahead in the game! If you have any questions, feel free to reach out.

Happy quizzing! 🎉

Cheers,
The Quizify Team 🌟`
                }
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        return res.redirect("/register")

                    }

                });
                await user.save();
            }
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    app.locals.tabswitch = false;//tab switch for site wide
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.setHeader("Cache-Control", "no-store");
    next();
})

app.get("/auth/google", passport.authenticate("google", {
    access_type: "offline",
    scope: ["profile", "email"]
}));

app.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    (req, res) => {
        res.redirect("/");
    }
);

app.use("/", authroutes);
app.use("/show", showroutes);
app.use("/leaderboard", leaderboardroutes);
app.use("/attendquiz", attendquizroutes);
app.use("/generate-quiz", generatequizroutes)
app.use("/createquiz", createquizroutes)
app.use("/attending", attendingroutes);
app.use("/buildquiz", typedquizroutes);
app.use("/generatequiz", usergeneratedroutes);
app.use("/follow", followroutes);
app.use("/profile", profileroutes);

app.get("/load", isLoggedIn, (req, res) => {
    if(req.session.quiztopic && req.session.qcount){
        return res.render("load");
    }
    else{
        return res.redirect("/");
    }
})
app.get("/editprofile", isLoggedIn,(req, res) => {
    res.render("profile/editprofile");
})
app.put("/editprofile", isLoggedIn,upload.single("image"),async(req, res) => {
    try{
        const user = await User.findById(req.user._id);
        if (req.body.username){
            user.username=req.body.username;
        }
        if (req.file) {
            user.profilePicture=req.file.path;
        }
        await user.save();
        req.login(user, (err) => {
            if (err) {
                return res.redirect("/editprofile");
            }
            return res.redirect(`/`);
        });
    }
    catch(e){
        console.log(e);
        req.flash("error", "Username already exists");
        return res.redirect("/editprofile");
    }
})
app.get(/(.*)/, (req, res) => {
    res.render("notfound");
})
app.listen(process.env.PORT || 3000, () => {
    console.log("listening");
})
