const express = require("express")
const router = express.Router();
const {dailyleaderboard,leaderboard,updatedAt} = require("../cronjob");

router.get("/", async (req, res)=>{
    const { type } = req.query;
    if (type === "alltime") {
        res.render("leaderboard/allleaderboard", {data:leaderboard(),updatedAt:updatedAt()});
    }
    else if (type === "daily"){
        res.render("leaderboard/dailyleaderboard",{data:dailyleaderboard(),updatedAt:updatedAt()});
    }
    else{
        return res.redirect("/notfound");
    }
})

module.exports=router;