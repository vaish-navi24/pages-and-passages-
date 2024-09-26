const express =require('express');
const app = express();
const path = require('path');
const fs = require('fs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const userModel = require('./modles/user');
const postModel = require('./modles/post');

app.set("view engine" , "ejs");
app.use(express.static(path.join(__dirname , "public")));

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const { title } = require('process');
app.use(cookieParser());

// is logged in function. 

function isLoggedIn(req, res , next) {
    if(req.cookies.token === "") {
        res.redirect("/signin");
    }

    else if(req.cookies.token === undefined) {

        res.redirect("/signin");
    }

    else {
        let data = jwt.verify(req.cookies.token , "itsmehi");
        req.user = data;
        next();
    }
}

// main route.
app.get("/" , async (req , res) => {
    let post1 = await postModel.findOne({filename : "smthg.txt"});
    let post2 = await postModel.findOne({filename : "bookrec1.txt"});
    let post3 = await postModel.findOne({filename:"program.txt"});
    res.render("homepage" , {post1 , post2, post3});
});

app.get("/view/posts" , async(req , res ) => {
    let posts = await postModel.find({posted : true});
    res.render("posts" , {posts});
});

app.get("/signin" , (req ,res) => {
    res.render("create");
});

app.post("/signup" , async (req , res ) => {
    let {username , password} = req.body;
    let user = await userModel.findOne({username});

    if(user) {
        res.send("user already exisits");
    }

    else {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, async function(err, hash) {
                // Storing hash in your password DB.
                let createdUser = await userModel.create({
                    username,
                    password: hash,
                });

                let token = jwt.sign({username : username , userid : createdUser._id}, 'itsmehi');
                res.cookie("token" , token);
                console.log(token);
                res.redirect(`/home/${createdUser._id}`);
            });
        });
    }
});

app.post("/login" , async (req , res) => {
    let {username , password} = req.body;
    let user = await userModel.findOne({username});

    if(user) {
        bcrypt.compare(password , user.password , function(err , result) {

            if(result) {
                let token = jwt.sign({username : username , userid : user._id}, 'itsmehi');
                res.cookie("token" , token);
                console.log(token);
                console.log(user);

                if(user.isAdmin) {
                    res.redirect(`/adminpage/${user._id}`);
                }

                else {
                    res.redirect(`/home/${user._id}`);
                }
            }

            else {
                res.redirect("/signin");
            }
        });
    }

    else {
        res.send("user does not exist");
    }
});

//after Logging in: 

app.get("/home/:id", isLoggedIn , async (req , res) => {
    let user = await userModel.findOne({_id : req.params.id});
    let post1 = await postModel.findOne({filename : "smthg.txt"});
    let post2 = await postModel.findOne({filename : "bookrec1.txt"});
    let post3 = await postModel.findOne({filename:"program.txt"});
    if(user.isAdmin) {
        res.redirect(`/adminpage/${user._id}`);
    }
    else {
        res.render("home" , {user , post1 , post2, post3});
    }
});


app.get("/view/:user/:id" , isLoggedIn , async (req , res) => {
    let user = await userModel.findOne({_id : req.params.user});
    let post = await postModel.findOne({_id : req.params.id});
    let content ;

    fs.readFile(`./files/${post.filename}` , "utf-8" , (err  , data) => {
        content = data;
        res.render("userView" , {content , post , user });
    });
});

app.get("/posts/:id" , isLoggedIn , async (req , res) => {
    let posts = await postModel.find({posted : true});
    let user = await userModel.findOne({_id : req.params.id});

    res.render("allposts" , {posts , user});
});

app.get("/logout" , (req , res ) => {
    res.cookie("token" , "");
    res.redirect("/");
});

app.get("/adminpage/:id" , isLoggedIn ,async (req , res) => {

    let user = await userModel.findOne({_id : req.params.id});
    let post1 = await postModel.findOne({filename : "smthg.txt"});
    let post2 = await postModel.findOne({filename : "bookrec1.txt"});
    let post3 = await postModel.findOne({filename : "program.txt"});
    if(user.isAdmin) {
        res.render("adminPage" , {user , post1 , post2, post3});
    }
    else {
        res.redirect(`/home/${user._id}`);
    }
});

app.get("/add/:id" , isLoggedIn , async (req , res) => {
    let admin = await userModel.findOne({_id : req.params.id});
    if(admin.isAdmin) {
        res.render("post" , {admin});
    }

    else {
        res.redirect(`/home/${admin._id}`);
    }
});

app.post("/save/draft" , async (req  , res ) => {
    let {filename , filecontent , cover , title } = req.body;
    fs.writeFile( `./files/${filename}` , `${filecontent}` , (err) => {
        console.log(filename);
    });

    let admin = await userModel.findOne({isAdmin : true});

    let post = await postModel.create({
        filename,
        cover, 
        title
    });

    res.redirect(`/drafts/${admin._id}`);
});

app.get("/drafts/:id" , async  (req , res) => {
    let admin = await userModel.findOne({isAdmin : true});
    let posts = await postModel.find();
    res.render("drafts" , {posts , admin});
});

app.get("/post/:id" , async (req , res) => {
    let post = await postModel.findOne({_id : req.params.id});
    let admin = await userModel.findOne({isAdmin : true});
    fs.readFile(`./files/${post.filename}` , "utf-8" , (err , data) => {
        let content = data;
        res.render("edit" , {content , post , admin});
    });
});

app.post("/save/changes/:id" , isLoggedIn , async (req , res) => {
    let admin = await userModel.findOne({isAdmin : true});
    let {title , cover , filecontent} = req.body;

    let post = await postModel.findOneAndUpdate({_id : req.params.id } , {title});
    await post.save();

    let post2 = await postModel.findOneAndUpdate({_id : req.params.id } , {cover});
    await post2.save();
    
    fs.writeFile(`./files/${post.filename}` , filecontent , (err) => {
        res.redirect(`/drafts/${admin._id}`);
    });
});

app.get("/delete/:id" , isLoggedIn , async (req , res ) => {
    let admin = await userModel.findOne({isAdmin : true});
    let post = await postModel.findOneAndDelete({_id : req.params.id});
    
    fs.unlink(`./files/${post.filename}` , (err) => {
        console.log("deleted");
    });

    res.redirect(`/drafts/${admin._id}`);
});

app.get("/upload/:id" , isLoggedIn , async(req , res ) => {
    let post = await postModel.findOne({_id : req.params.id});
    let admin = await userModel.findOne({isAdmin : true});
    let content;
    fs.readFile(`./files/${post.filename}` , "utf-8"  ,  (err , data) => {
        content = data;
        res.render("preview" , {post , admin , content});
    }); 
});

app.get("/post/upload/:id" , isLoggedIn , async (req , res) => {
    let post = await postModel.findOneAndUpdate({_id : req.params.id} , {posted : true});
    await post.save();
    let admin = await userModel.findOne({isAdmin : true});
    res.send(post);
});

app.get("/view/:id" , async(req , res) => {
    let post = await postModel.findOne({_id : req.params.id});
    let content;
    fs.readFile(`./files/${post.filename}` , "utf-8" , (err  , data) => {
        content = data;
        res.render("viewPostout" , {content , post});
    });
});


app.listen(3000);