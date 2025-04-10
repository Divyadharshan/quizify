module.exports.isLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.returnTo = req.originalUrl;
        return req.session.save(()=>{
            res.redirect("/login");
        });
    }
    next();
}

module.exports.storeReturnTo = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

module.exports.isAuth = (req,res,next)=>{
    if(req.isAuthenticated()){
        return res.redirect("/");
    }
    next();
}