const express = require("express")
const router = express.Router();
const app = express();
const User = require("../models/user");
const UserQuiz = require("../models/userquiz");
const { isLoggedIn, isAuth, storeReturnTo } = require("../middleware");
const { transporter } = require("../mailconfig");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const Groq = require("groq-sdk").default;

router.get("/", isLoggedIn, (req, res) => {
    res.render("quizpages/home");
})

router.get("/login", isAuth, (req, res) => {
    res.render("auth/login");
})

router.post("/login", storeReturnTo, isAuth, passport.authenticate("local", { failureRedirect: "/login", failureFlash: "Invalid username or password!" }), (req, res) => {
    const gotourl = res.locals.returnTo || "/";
    res.redirect(gotourl);
});

router.get("/register", isAuth, (req, res) => {
    res.render("auth/register");
});

router.post("/register", isAuth, async (req, res, next) => {
    try {
        const { email, username } = req.body;
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            req.flash("error", "Username or Email already exists. Please try another.");
            return res.redirect("/register");
        }
        const token = jwt.sign({ email, username }, process.env.JWTSECRET, { expiresIn: "300s" });
        const verifylink = `https://${req.headers.host}/verifyaccount/${token}`;
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Verify Your Account - Quizify",
            text: `
Dear ${username},
Click the link below to verify your account:
${verifylink}
This link expires in 5 minutes.\n
Happy Quizzing,
The Quizify Team 🌟`
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                req.flash("error", "Invalid email!");
                return res.redirect("/register");
            }
            else {
                req.flash("success", "Verification link has been sent to your mail. Check Spam folder too");
                return res.redirect("/login");
            }
        })
    }
    catch (ex) {
        req.flash("error", ex.message);
        res.redirect("/register");
    }
})

router.get("/verifyaccount/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWTSECRET);
        const { email, username } = decoded;
        res.render("auth/setpwd", { username, email });
    }
    catch (e) {
        req.flash("error", "Invalid or expired token");
        res.redirect("/register");
    }
})

router.post("/setpwd", async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "🎉 Welcome to Quizify - Let the Quizzing Begin!",
            text: `
Hi ${username},
        Welcome to Quizify! 🎯 We're thrilled to have you on board. Get ready to explore, create, and challenge yourself with exciting quizzes!
         🔥 Here's what you can do:
                ✅ Play quizzes on various topics 📚
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
                console.log("error")
                return res.redirect("/register");
            }
            else {
                return res.redirect("/login");
            }
        })
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.redirect("/login");
        })
    }
    catch (e) {
        res.redirect("/register");
    }
})

router.get("/logout", isLoggedIn, (req, res, next) => {
    req.logout(err => {
        if (err)
            return next(err);
        req.session.destroy(() => res.redirect("/login"));
    })
})

router.post('/logout', async (req, res) => {
    const user = await User.findById(req.user._id);
    const ind = new Date().toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).split("/").reverse().join("-");

    const attempt = user.logoutAttempts.find(a => a.date === ind);
    if (attempt) {
        attempt.times += 1;
        console.log("check2");
    }
    else {
        user.logoutAttempts.push({ date: ind, times: 1 });
        console.log("check1");
    }
    app.locals.tabswitch = true;
    await user.save();
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false });
        }
        return res.status(200).json({ success: true });
    });
});

router.post('/quizlogout', async (req, res) => {
    const quiz = await UserQuiz.findOne({ number: req.body.number });
    const attempt = quiz.logoutAttempts.find(a => a.user.toString() === req.user._id.toString());
    if (attempt) {
        attempt.times += 1;
        console.log("check2");
    }
    else {
        quiz.logoutAttempts.push({ user: req.user._id, times: 1 });
        console.log("check1");
    }
    app.locals.tabswitch = true;
    await quiz.save();
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false });
        }
        return res.status(200).json({ success: true });
    });
});

router.get("/changepwd", isAuth, (req, res) => {
    res.render("auth/changepwd");
})

router.post("/changepwd", isAuth, async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email: email })
    if (!user) {
        req.flash("error", "User doesn't exists");
        return res.redirect("/changepwd")
    }
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWTSECRET, { expiresIn: '120s' });
    const resetURL = `https://${req.headers.host}/resetpassword?id=${user._id}&token=${token}`;
    const username = user.username;
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Quizify - Forgot Password/Username',
        text: `
You are receiving this mail because you(or someone else) have requested to know username/change password.\n
Your username is: ${username}\n
In case you need to change password use the link below:
${resetURL}\n
If you did not request this, please ignore this email, and your password will remain unchanged.\n
Best regards,
The Quizify Team 🌟`
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            req.flash("error", 'Invalid email')
            return res.redirect("/changepwd")

        } else {
            req.flash("success", 'Your Username & Password reset link has been sent to your mail')
            return res.redirect("/changepwd")
        }
    });
})

router.get('/resetpassword', isAuth, (req, res) => {
    let { id, token } = req.query;
    try {
        const check = jwt.verify(token, process.env.JWTSECRET)
        return res.render("auth/resetpass", { id: id, token: token })
    } catch (error) {
        req.flash("error", "Link has expired")
        res.redirect('/changepwd')
    }

})
router.post('/resetpassword', isAuth, async (req, res) => {
    const { password } = req.body;
    const user = await User.findOne({ _id: req.query.id });
    if (user) {
        await user.setPassword(password);
        await user.save()
        req.flash("success", "Password has been reset successfully")
        return res.redirect("/login");
    }
})

router.get("/setpwd", isAuth, (req, res) => {
    res.render("auth/setpwd");
})

router.get("/viewquizzes/:id", isLoggedIn, async (req, res) => {
    try {
        const Quiz = await UserQuiz.find({ author: req.params.id });
        if (!(req.user._id.toString() === req.params.id.toString())) {
            return res.redirect("/restricted");
        }
        res.render("quizpages/viewquizzes", { quizzes: Quiz })
    }
    catch (e) {
        return res.redirect("/notfound");
    }

})
router.get("/viewquiz/:id", isLoggedIn, async (req, res) => {
    try {
        const Quiz = await UserQuiz.find({ _id: req.params.id });
        if (!(req.user._id.toString() === Quiz[0].author.toString())) {
            return res.redirect("/restricted");
        }
        const usernames = [], scores = [], logouts = [];
        for (const a of Quiz[0].userAttempts) {
            scores.push(a.score);
            const la = Quiz[0].logoutAttempts.find(k => k.user && k.user.toString() === a.user.toString());
            if (la) {
                logouts.push(la.times);
            }
            else {
                logouts.push(0);
            }
            const us = await User.findById(a.user);
            usernames.push(us.username);
        }
        res.render("quizpages/viewquiz", { quizzes: Quiz, usernames, scores, logouts })
    }
    catch (e) {
        return res.redirect("/notfound");
    }
})
router.get("/updatequiz/:id", isLoggedIn, async (req, res) => {
    try {
        const Quiz = await UserQuiz.find({ _id: req.params.id });
        if (!(req.user._id.toString() === Quiz[0].author.toString())) {
            return res.redirect("/restricted");
        }
        res.render("quizpages/updatequiz", {quizzes:Quiz})
    }
    catch (e) {
        return res.redirect("/notfound");
    }
})
router.put("/viewquiz/:id", isLoggedIn, async (req, res) => {
    try {
        const quiz = await UserQuiz.findById(req.params.id);
        if (!quiz || req.user._id.toString() !== quiz.author.toString()) {
            return res.redirect("/restricted");
        }

        const updatedQuestions = quiz.questions.map((q, qIndex) => {
            const updatedOptions = q.options.map((_, optIndex) => {
                return req.body[`option-${qIndex}-${optIndex}`] || "";
            });

            const updatedCorrect = parseInt(req.body[`correctoption-${qIndex}`], 10);
            const updatedTitle = req.body[`question-${qIndex}`] || "";

            return {
                question: updatedTitle,
                options: updatedOptions,
                correctoption: updatedCorrect
            };
        });

        quiz.questions = updatedQuestions;
        await quiz.save();
        res.redirect(`/viewquiz/${quiz._id}`);
    } catch (e) {
        console.error("Error updating quiz:", e);
        res.status(500).send("Error updating quiz");
    }
});

router.delete("/viewquiz/:id", isLoggedIn, async (req, res) => {
    try{
        const Quiz = await UserQuiz.find({ _id: req.params.id });
        if(!(req.user._id.toString()===Quiz[0].author.toString())){
            return res.redirect("/restricted");
        }
        await UserQuiz.deleteOne({ _id: req.params.id });
        return res.redirect(`/viewquizzes/${req.user._id}`);
    }
    catch(e){
        return res.redirect("/error");
    }
})

router.get("/warning", (req, res) => {
    if (app.locals.tabswitch === true) {
        app.locals.tabswitch = false;
        return res.render("auth/warning");
    }
    else {
        return res.redirect("/");
    }
})

//Chatbot
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_CHATBOT });
router.post("/chat",isLoggedIn, async (req, res) => {
  const userMessage = req.body.messages;
  try {
    const response = await groq.chat.completions.create({
      model: process.env.MODEL2,
      messages: [
        {
          role: "system",
          content: process.env.BOTPROMPT,
          },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply = response.choices?.[0]?.message?.content || "Sorry, no response.";
    res.json({ reply });
  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ reply: "Error talking to Groq." });
  }
});

module.exports = router;