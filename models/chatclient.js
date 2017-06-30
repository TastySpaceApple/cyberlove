var Vent = require('../lib/eventdispatcher');

function Client(socket, user){
	this.socket = socket;
	if(user && user.username){
		this.name = user.username;
	}
	else{
  	this.name = 'Guest' + Math.floor(Math.random() * 100);
	}
  this.attributes = {age: 18, country:'Israel'};
  this.preferences = {minAge: 10, maxAge:20}
  this.cooldownlist = {};
  this.id = socket.id;
  this.vent = new Vent();
	var self = this;
	socket.on('video-signal', function(message){
		self.send('video-signal', message);
	})
	socket.on('chat-message', function(message){
		self.send('chat-message', message);
	});
  socket.on('next', function(){
    if(self.partner){
      self.cooldownlist[self.partner.id] = Math.floor(Math.random() * 20) + 10;
      console.log('cooldown ' +
      self.cooldownlist[self.partner.id] )
      self.partner.endChat();
    }
    self.endChat();
  });
  socket.on('disconnect', function(){
    self.vent.trigger('disconnect');
  });
	this.partner = null;
}

Client.prototype.connect = function(user){
  this.setPartner(user);
  user.setPartner(this);
  this.socket.emit('chat-start', user.name);
}

Client.prototype.checkCooldown = function(user){
  console.log(user.id + '  '  + this.cooldownlist);
  if(user.id in this.cooldownlist){
    console.log(this.cooldownlist[user.id]--);
    if(this.cooldownlist[user.id] <= 0)
      delete this.cooldownlist[user.id];
    return false;
  }
  return true;
}

Client.prototype.endChat = function(){
  if(!this.socket) return;
  this.socket.emit('chat-end');
  this.partner = null;
  var self = this;
  setTimeout(function(){
    self.vent.trigger('next');
  }, 800);
}

Client.prototype.setPartner = function(user){
  var self = this;
  this.partner = user;
  this.partner.on('disconnect', function(){ self.endChat(); })
}

Client.prototype.send = function(type, message){
  if(typeof(message) == 'object')
    message.partnerName = this.name;
	this.partner.receive(type, message);
}

Client.prototype.receive = function(type, message){
	this.socket.emit(type, message);
}

Client.prototype.on = function(eventName, callback){
  this.vent.subscribe(eventName, callback);
}


exports = module.exports = Client;
