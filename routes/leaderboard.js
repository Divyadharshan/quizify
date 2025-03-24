const express = require("express")
const router = express.Router();
const {dailyleaderboard,leaderboard} = require("../cronjob");

router.get("/", async (req, res)=>{
    const { type } = req.query;
    if (type === "alltime") {
        res.render("leaderboard/allleaderboard", {data:leaderboard()});
    }
    else if (type === "daily"){
        res.render("leaderboard/dailyleaderboard",{data:dailyleaderboard()});
    }
    else{
        return res.redirect("/notfound");
    }
})

module.exports=router;