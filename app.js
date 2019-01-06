var express=require('express');
var app=express();
var bodyParser=require('body-parser');
var mongoose=require('mongoose');
var passport=require('passport');
var LocalStrategy=require('passport-local');
var passportLocalMongoose=require('passport-local-mongoose');
var leaderBoard=require('@gamestdio/leaderboard');

mongoose.connect("mongodb://localhost/yelp_camp_3")
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");



var userSchema=new mongoose.Schema({
	username:String,
	password:String
});
userSchema.plugin(passportLocalMongoose);
var User=mongoose.model("User",userSchema);

app.use(require("express-session")({
	secret:"hello",
	resave:false,
	saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	next();
});



var commentSchema=new mongoose.Schema({
	text : String,
	author : {
		id:{
			type : mongoose.Schema.Types.ObjectId,
			ref : "User"
		},
		username : String
	}
});

var Comment=mongoose.model("Comment",commentSchema);

var campgroundSchema= new mongoose.Schema({
	name : String,
	image : String,
	description:String,
	likes: {type : Number , default : 0},
	author:{
		id : {
			type : mongoose.Schema.Types.ObjectId,
			ref : "User"
		},
		username : String
	},
	comments : [
		{
			type : mongoose.Schema.Types.ObjectId,
			ref : "Comment"
		}
	]
});

var Campground =mongoose.model("Campground",campgroundSchema);
//
app.get("/campground",function(req,res){
	Campground.find({},function(error,campground){
		if(error){
			console.log(error);
		}else{
			res.render("index",{camp : campground});
		}
	});
	
});

app.get("/leaderboard",function(req,res){
	Campground.find({}).sort([["likes","descending"]]).exec(function(err,leader){
		if (err){
			console.log(err);
		} else {
			res.render("leader",{leader:leader});
		}
	});
});

app.post("/campground",isLoggedIn,function(req,res){
	var name=req.body.name;
	var image=req.body.image;
	var desc=req.body.description;
	var author={
		id  : req.user._id,
		username : req.user.username
	}
	var data={name: name , image:image , description:desc , author:author}
	Campground.create(data,function(error,data){
		if(error){
			console.log(error);
		}else{
			res.redirect("/campground");
		}
	});
});

app.get("/",function(req,res){
	res.redirect("/campground");
});

app.get("/campground/add",isLoggedIn,function(req,res){
	res.render("add");
});

app.get("/campground/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments").exec(function(error,data){
		if(error){
			console.log(error);
		} else{
			res.render("show",{campground:data});
		}
	});
	
});
app.post("/campground/:id", function(req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            console.log(err);
        } else {
            campground.likes += 1;
            campground.save();
            res.redirect("/");
        }
    });
});



app.get("/campground/:id/comments/new",isLoggedIn,function(req,res){
	Campground.findById(req.params.id, function(err,campground){
		if(err){
			console.log(err);
		} else{
			res.render("new",{campground: campground});
		}
	});
});

app.post("/campground/:id/comments",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if (err){
			console.log(err);
		} else {
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					console.log(err);
				} else {
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					comment.save();
					campground.comments.push(comment);
					campground.save();
					res.redirect("/campground/" + campground._id);
				}
			});
		}
	});
});


app.get("/register",function(req,res){
	res.render("register");
});

app.post("/register",function(req,res){
	var newUser=new User({username: req.body.username});
	User.register(newUser , req.body.password,function(err,user){
		if(err){
			console.log(err);
			return res.redirect("/register");
		}
		passport.authenticate("local")(req,res,function(){
			res.redirect("/campground");
		});
	});
});

app.get("/login",function(req,res){
	res.render("login");
});

app.post("/login",passport.authenticate("local",{
	successRedirect:"/campground",
	failureRedirect:"/login"
}),function(req,res){});

app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/campground");
});



function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	else{
		res.redirect("/login");
	}
}

app.listen(3000,function(){
	console.log("Server Started!!");
});