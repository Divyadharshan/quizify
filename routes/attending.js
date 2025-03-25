const express = require("express")
const router = express.Router();
const UserQuiz = require("../models/userquiz");
const User = require("../models/user");
const {isLoggedIn} = require("../middleware");

router.get("/", isLoggedIn, async (req, res) => {
    if (!req.session.code) {
        return res.redirect("/attending");
    }
    try {
        const quiz = await UserQuiz.findOne({ number: req.session.code });
        if (!quiz) {
            return res.redirect("/notfound")
        }
        const userAttempt = quiz.userAttempts.find(attempt => attempt.user.toString() === req.user._id.toString());
        if (userAttempt) {
            return res.render("solved",{data:quiz,score:userAttempt.score,caption:"You have already attempted this Quiz!"});
        }
        const user = await User.findById(quiz.author);
        res.render("quizpages/attending", { data: quiz , author : user.username});
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return res.send("Error!!!");
    }

})

router.post("/", isLoggedIn, async (req, res) => {
    if (!req.session.code) {
        return res.redirect("/attendquiz");
    }
    try {
        const quiz = await UserQuiz.findOne({ number: req.session.code });
        if (!quiz) {
            return res.status(404).send("Quiz not found");
        }

        const user = await User.findById(req.user._id);
        const userAttempt = quiz.userAttempts.find(attempt => attempt.user.toString() === req.user._id.toString());
        if (userAttempt) {
            return res.render("solved",{data:quiz,score:userAttempt.score,caption:"You have already attempted this Quiz!"});
        }
        let score = 0;
        const userAnswers = req.body;
        quiz.questions.forEach((question, index) => {
            const userAnswer = userAnswers[`question_${index}`];
            if (userAnswer && parseInt(userAnswer) === question.correctoption) {
                score++;
            }
        });
        quiz.userAttempts.push({ user: user._id, score });
        await quiz.save();
        return res.render("solved",{data:quiz,score,caption:"Congratulations!"});
    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).send("Internal Server Error");
    }
})
module.exports=router;