const express = require("express")
const router = express.Router();
const UserQuiz = require("../models/userquiz");
const {isLoggedIn} = require("../middleware");

router.get("/", isLoggedIn, (req, res) => {
    newQuiz = new UserQuiz();
    if (!req.session.newQuiz) {
        res.render("quizpages/createquiz", { newQuiz });
    }
    else {
        const newQuiz = req.session.newQuiz;
        delete req.session.newQuiz;
        res.render("quizpages/createquiz", { newQuiz });
    }
})

router.post("/", isLoggedIn, async (req, res) => {
    const { quiztopic,qcount } = req.body;
    req.session.quiztopic = quiztopic;
    req.session.qcount=qcount;
    return res.redirect("/load")
})

module.exports=router;