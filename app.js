var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var users = {};

io.on('connection', function(socket){
	console.log('connection');
	var user = new User(socket);
	var id = socket.id;
	users[id] = user;
	socket.on('search', function(callback){
		var foundpartner = false;
		for(var userid in users){
			if(userid != id){
				users[userid].connect(user);
				user.connect(users[userid]);
				foundpartner = true;
				break;
			}
		}
		callback(foundpartner)
	});
	socket.on('disconnect', function(){
		delete users[id];
	});
});
function User(socket){
	this.socket = socket;
	var self = this;
	socket.on('send', function(message){
		self.send(message);
	})
	this.partner = null;
}
User.prototype.connect = function(user){
	this.partner = user;
}
User.prototype.send = function(message){
	this.partner.receive(message);
}
User.prototype.receive = function(message){
	this.socket.emit('receive', message);
}
app.use(express.static('static'));
server.listen( (process.env.PORT || 3000) );