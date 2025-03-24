const express = require("express")
const router = express.Router();
const {isLoggedIn} = require("../middleware");

router.get("/", isLoggedIn, (req, res) => {
    res.render("quizpages/attendquiz");
})
router.post("/", isLoggedIn, (req, res) => {
    const { quizcode } = req.body;
    req.session.code = quizcode;
    return res.redirect("/attending");
})
module.exports=router;