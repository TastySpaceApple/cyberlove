var express = require('express');
var passport = require('passport');
var multer = require('multer');
var User = require('../models/user');
var upload = multer({ storage: multer.memoryStorage() })
var router = express.Router();
var path = require('path');


function usersOnly(req, res, next){
  if(req.user == null)
    res.redirect('/');
  else
    next();
}

router.get('/', function (req, res) {
  res.render('index', { user : req.user });
});

router.get('/api/get/userlist',  function (req, res) {
  User.find({}, function (err, users) {
    res.send(users);
  });
})

router.get('/chat', function (req, res) {
    res.render('chat', { user : req.user });
});

router.get('/update', usersOnly, function (req, res) {
    res.render('update', { user : req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { user : req.user });
});

router.get('/chat', function(req, res) {
    res.render('chat', { user : req.user });
});

router.get('/users/:username', function(req, res) {
  User.findOne({ username:req.params.username }, function(err, viewedUser){
    if(err || !viewedUser)
      res.redirect('/usernotfound');
    else
      res.render('user', { user : req.user, viewedUser : viewedUser });
  })
});

router.get('/users/:username/avatar', function(req, res) {
  User.findOne({ username:req.params.username }, function(err, viewedUser){
    if (err || !viewedUser || !viewedUser.avatar || !viewedUser.avatar.data){
      res.sendFile(path.join(__dirname, '../static/assets/images/no-user-icon.png'));
    }
    else{
      res.contentType(viewedUser.avatar.contentType);
      res.send(viewedUser.avatar.data);
    }
  })
});

router.post('/update', usersOnly, upload.single('avatar'), function(req, res) {
  var info =  {
    gender : req.body.gender,
    sexuality: req.body.sexuality,
    birthdate: new Date(parseInt(req.body.birthdate_year), parseInt(req.body.birthdate_month), parseInt(req.body.birthdate_day) + 1),
    bio: req.body.bio
  }
  console.log(req.file);
  if(req.file){
    info.avatar = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    }
  }
  User.findOneAndUpdate({username: req.user.username}, info, function(err){
    if(err){
      res.send(err);
      console.log(err);
    }
    else
      res.redirect('/users/'+req.user.username);
  });
});

router.post('/register', function(req, res) {
    var info =  {
      username: req.body.username,
      gender : req.body.gender,
      sexuality: req.body.sexuality,
      birthdate: new Date(req.body.birthdate_year, req.body.birthdate_month, req.body.birthdate_day),
      bio: req.body.bio
    };

    //req.files.FormFieldName

    User.register(new User(info), req.body.password, function(err, user) {
        if (err) {
            return res.render('register', { user : user });
        }

        passport.authenticate('local')(req, res, function () {
            res.redirect('/');
        });
    });
});

router.get('/login', function(req, res) {
    res.render('login', { user : req.user });
});

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});

module.exports = router;
