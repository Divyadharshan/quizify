const cron = require("node-cron");
const User = require("./models/user");

let cacheleaderboard=[];
let cachedailyleaderboard=[];

async function updateleaderboard(){
    cacheleaderboard = await User.find({}, { username: 1, totalScore: 1, profilePicture: 1 }).sort({ totalScore: -1 });
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ind = yesterday.toLocaleDateString("en-GB", {
            timeZone: "Asia/Kolkata", 
            year: "numeric", 
            month: "2-digit", 
            day: "2-digit"
    }).split('/').reverse().join('-');

    cachedailyleaderboard = await User.aggregate([
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
        $sort:{"quizAttempts.score":-1}
    },
    { 
        $project:{username:1,profilePicture:1,"quizAttempts.score":1,"quizAttempts.date":1}
    }
    ]);
}
cron.schedule("24 0 * * *",async()=>{
    await updateleaderboard();
    console.log("Updated Leaderboard at 12:24AM");
},{
    scheduled:true,
    timezone:"Asia/Kolkata"
});
module.exports={
    dailyleaderboard:()=>cachedailyleaderboard,
    leaderboard:()=>cacheleaderboard
};