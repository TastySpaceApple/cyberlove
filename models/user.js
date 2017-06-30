var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var User = new Schema({
    username: String,
    password: String,
    bio: String,
    gender: String,
    sexuality: String,
    birthdate: Date,
    avatar: { data: Buffer, contentType: String },
    status: String,
    tags: [String],
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
