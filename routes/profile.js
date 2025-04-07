const express = require("express")
const router = express.Router();
const User = require("../models/user");

router.get("/:username", async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    var usernames=[]
    var pictures=[]
    if (user){
        for(const u of user.followers){
            const us = await User.findById(u);
            usernames.push(us.username);
            pictures.push(us.profilePicture);
        }
    }
    if (user) {
        //counting users with greater score
        const rank = user.rank;
        if (!req.isAuthenticated()) {
            res.render("profile/profile", { user, rank, check: false, usernames,pictures});
        }
        else {
            const check = await user.followers.includes(req.user._id);
            res.render("profile/profile", { user, rank, check: check, usernames,pictures});
        }
    }
    else {
        return res.redirect("/profilenotfound");
    }
})

module.exports=router;