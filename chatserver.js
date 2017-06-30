//var satelize = require('satelize');
var Client = require('./models/chatclient');
var Matchmaker = require('./models/matchmaker');
var matchmaker = new Matchmaker();
var socketio = require('socket.io');
var passportSocketIo = require("passport.socketio");
var clients = {};
var io;

function start(httpserver, sessionStore){
  io = socketio(httpserver);
  io.use(passportSocketIo.authorize({
        cookieParser: require('cookie-parser'),
        key:          'app.sid',
        secret:       'maurice ate it',
        store:        sessionStore,
        fail: function(data, message, critical, accept) {
            accept(null, true);
        },
        success: function(data, accept) {
            accept(null, true);
        }
    })
  );
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
  return {
    getClients : function(){
      return clients;
    }
  }
}

function handleClient(socket){
  //console.log(socket.request.headers.cookie);
  var client = new Client(socket, socket.request.user);
  clients[client.id] = client;

  client.on('disconnect', function(){
    console.log('disconnected');
    matchmaker.removeClient(client);
    delete clients[client.id];
  });
  client.on('next', function(){
    matchmaker.removeClient(client);
    matchmaker.addClient(client);
  });
}
exports = module.exports = start;
