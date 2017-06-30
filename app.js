// dependencies
var http = require('http');
var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const MongoDBStore = require('connect-mongodb-session')(session);
var config = require('./config');

var routes = require('./routes/index');

var app = express();

var sslRedirect = require('heroku-ssl-redirect');

app.use(sslRedirect());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
var sessionStore = new MongoDBStore({
   uri: config.uri_session_db,
   collection: 'user-sessions'
 });
app.use(session({
    store: sessionStore,
    key: 'app.sid',
    secret: 'maurice ate it',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'static')));


app.use('/', routes);

// passport config
var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// mongoose
mongoose.connect(config.uri_users_db);


var httpserver = http.createServer(app);
var chatserver = require('./chatserver')(httpserver, sessionStore);

app.get('/api/chat/users', function (req, res) {
  var users = [], clients = chatserver.getClients(), count = 0, max = 10;
  for(var clientId in clients){
    count++;
    users.push(clients[clientId].name);
    if(count > max)
      break;
  }
  res.send(users);
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            user: req.user
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

httpserver.listen( (process.env.PORT || 3000) );

console.log('Started');

module.exports = app;
