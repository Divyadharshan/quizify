const cron = require("node-cron");
const User = require("./models/user");
const Leaderboard = require("./models/leaderboard");

let cacheleaderboard=[];
let cachedailyleaderboard=[];
let leaderboard=[];
let dailyleaderboard=[];

async function updateleaderboard(){
    leaderboard = await User.find({}, { username: 1, totalScore: 1, profilePicture: 1 }).sort({ totalScore: -1, username :-1 });
    await Leaderboard.findOneAndUpdate({type:"overall"},{data:leaderboard},{upsert:true,new:true});
    const overall=await Leaderboard.findOne({type:"overall"});
    var r = 1;
    for(let u of overall.data){
        const us = await User.findOne({username:u.username});
        us.rank=r;
        us.save();
        r++;
    }
    cacheleaderboard=overall?overall.data:[];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ind = yesterday.toLocaleDateString("en-GB", {
            timeZone: "Asia/Kolkata", 
            year: "numeric", 
            month: "2-digit", 
            day: "2-digit"
    }).split('/').reverse().join('-');
    dailyleaderboard = await User.aggregate([
    { 
        $match:{"quizAttempts.date":ind}
    },
    { 
        $unwind:"$quizAttempts"
    },
    { 
        $match:{"quizAttempts.date":ind}
    },
    { 
        $sort:{"quizAttempts.score":-1,"username":-1}
    },
    { 
        $project:{username:1,profilePicture:1,"quizAttempts.score":1,"quizAttempts.date":1}
    }
    ]);
    await Leaderboard.findOneAndUpdate(
        { type: "daily" },
        { data: dailyleaderboard},
        { upsert: true, new: true }
    );
    const daily=await Leaderboard.findOne({type:"daily"});
    cachedailyleaderboard=daily?daily.data:[];
}
cron.schedule("24 0 * * *",async()=>{
    await updateleaderboard();
    console.log("Updated Leaderboard at 12:24AM");
},{
    scheduled:true,
    timezone:"Asia/Kolkata"
});

async function loadonrestart(){
    const overall=await Leaderboard.findOne({type:"overall"});
    cacheleaderboard=overall?overall.data:[];
    const daily=await Leaderboard.findOne({type:"daily"});
    cachedailyleaderboard=daily?daily.data:[];
}

//load on server restart
(async () => {
    await loadonrestart();
})();

module.exports={
    dailyleaderboard:()=>cachedailyleaderboard,
    leaderboard:()=>cacheleaderboard
};