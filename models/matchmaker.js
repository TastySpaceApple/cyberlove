function MatchMaker(){
  this.clients = [];
  this.running = false;
}

MatchMaker.prototype.addClient = function(client){
  this.clients.push(client);
}
MatchMaker.prototype.removeClient = function (client){
  for(var i = 0; i < this.clients.length; i++){
    if(this.clients[i] == client){
      this.clients.splice(i, 1);
      return true;
    }
  }
  return false;
}
MatchMaker.prototype.match = function(){
  var self = this;
  if(this.clients.length < 2 || !this.running)
    return this.loopTimer = setTimeout(function(){ self.match() }, 1000 / (this.clients.length+1)), false;
  
  var clients = this.clients;
  var clientIndex = 0;
  var client = clients[clientIndex];
  var maxMatchedClient;
  var maxFactor = -1;
  var maxMatchedIndex = -1;
  for(var i = 0; i < clients.length; i++){
    if(clients[i].id == client.id) continue;
    var client1Accept = client.checkCooldown(clients[i]);
    var client2Accept = clients[i].checkCooldown(client);
    if(!(client1Accept && client2Accept)){
      continue;
    }
    
    var matchFactor = this.calculateMatchFactor(client, clients[i]);
    console.log(matchFactor);
    if(matchFactor > maxFactor || (matchFactor == maxFactor && Math.random() > .5) ){
      maxFactor = matchFactor;
      maxMatchedIndex = i;
    }
  }
  if(maxMatchedIndex != -1){
    // connect them
    client.connect(clients[maxMatchedIndex]);
    console.log('match made in heaven: ' + client.name + ' <3 ' + clients[maxMatchedIndex].name);
    // remove from singles list
    this.clients.splice(clientIndex, 1);
    this.clients.splice(maxMatchedIndex, 1);
    
  }
  var self = this;
  if(this.running)
    this.loopTimer = setTimeout(function(){ self.match() }, 1000 / (this.clients.length+1));
}

MatchMaker.prototype.calculateMatchFactor = function(client1, client2){
  var factor1, factor2;
  factor1 = this.calculateFitFactor (client1.preferences, client2.attributes);
  factor2 = this.calculateFitFactor (client2.preferences, client1.attributes);
  return (factor1 + factor2) / 2;
}

MatchMaker.prototype.calculateFitFactor = function(preferences, attributes){
  var prefCount = 0;
  var fitCount = 0; 
  if('minAge' in preferences && 'maxAge' in preferences){
    prefCount += 1;
    if('age' in attributes && (preferences.minAge <= attributes.age && attributes.age <= preferences.maxAge))
      fitCount += 1;
  }
  for(var key in preferences){
    if(key == 'minAge' || key == 'maxAge') continue; // skip the age..
    prefCount += 1;
    if(preferences[key] == attributes[key])
      fitCount += 1;
  }
  return fitCount / prefCount;
}

MatchMaker.prototype.run = function(){
  this.running = true;
  this.match();
}

MatchMaker.prototype.stop = function(){
  clearInterval(this.loopTimer);
  this.running = false;
}

exports = module.exports = MatchMaker;
