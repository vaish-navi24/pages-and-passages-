const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/nodeBlog");

const userSchema = mongoose.Schema({
    username : String, 
    password : String, 
    isAdmin : {
        type: Boolean,
        default: false,
    },
    likedPosts : [
        {type : String }
    ],
});

module.exports = mongoose.model("user" , userSchema);