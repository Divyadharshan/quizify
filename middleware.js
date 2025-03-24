module.exports.isLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        return res.redirect("/login");
    }
    next();
}

module.exports.isAuth = (req,res,next)=>{
    if(req.isAuthenticated()){
        return res.redirect("/");
    }
    next();
}