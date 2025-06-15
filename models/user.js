const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportlocalmongoose = require("passport-local-mongoose");

const userschema = new Schema({
    username : {type:String, unique:true, required:true},
    email:{type:String,unique:true},
    logoutAttempts:[{date:String,times:Number}],
    quizAttempts:[{date:String,score:Number}],
    totalScore:{type:Number,default:0},
    profilePicture:{
        type:String,
        default : "https://static-00.iconduck.com/assets.00/profile-circle-icon-256x256-cm91gqm2.png"
    },
    followers: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    rank : {type:Number,default:0},
    xp : {type:Number,default:0},
    won : {type:Number, default:0},
    lost : {type:Number, default:0},
    draw : {type:Number, default:0}

});
userschema.plugin(passportlocalmongoose);
module.exports=mongoose.model("User",userschema);