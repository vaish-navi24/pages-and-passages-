const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    title : String,
    cover : String, 
    filename : String, 
    likes : [
        {type : String}
    ],
    posted : {
        type:Boolean,
        default : false,
    }
});

module.exports = mongoose.model("post" , postSchema);