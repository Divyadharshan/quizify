const express = require("express")
const router = express.Router();
const {isLoggedIn} = require("../middleware");

router.get("/", isLoggedIn, (req, res) => {
    if(req.query){
        var {quizcode} = req.query;
    }
    else{
        quizcode='0';
    }
    res.render("quizpages/attendquiz",{code:quizcode});
})
router.post("/", isLoggedIn, (req, res) => {
    const { quizcode } = req.body;
    req.session.code = quizcode;
    return res.redirect("/attending");
})
module.exports=router;