const express = require("express")
const router = express.Router();
const User = require("../models/user");

router.get("/:username", async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    if (user) {
        //counting users with greater score
        const hscores = await User.countDocuments({ totalScore: { "$gt": user.totalScore } });
        const rank = hscores + 1;
        if (!req.isAuthenticated()) {
            res.render("profile/profile", { user, rank, check: false });
        }
        else {
            const check = await user.followers.includes(req.user._id);
            res.render("profile/profile", { user, rank, check: check });
        }
    }
    else {
        return res.redirect("/profilenotfound");
    }
})

module.exports=router;