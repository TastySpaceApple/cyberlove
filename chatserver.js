//var satelize = require('satelize');
var Client = require('./models/chatclient');
var Matchmaker = require('./models/matchmaker');
var matchmaker = new Matchmaker();
var socketio = require('socket.io');
var clients = {};
var io;

function start(server){
  io = socketio(server);
  matchmaker.run();
	io.on('connection', handleClient);
  /*(socket){
		var client = new User(socket);
		socket.on('search', function(callback){
			var foundpartner = false;
			for(var userid in clients){
				if(userid != id){
					clients[userid].connect(user);
					user.connect(clients[userid]);
					foundpartner = true;
					break;
				}
			}
			callback(foundpartner)
		});
		socket.on('disconnect', function(){
			delete clients[id];
		});
	});*/
}

function handleClient(socket){
  var client = new Client(socket);
  clients[client.id] = client;
  
  client.on('disconnect', function(){
    console.log('disconnected');
    matchmaker.removeClient(client);
    delete clients[client.id];
  });
  client.on('next', function(){
    matchmaker.addClient(client);
  });
}
exports = module.exports = start;