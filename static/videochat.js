function EventDispatcher(){
	var event_listeners = {};
	function trigger(eventName, args){
		var l = event_listeners[eventName];
		if(!l) return;
		for(var i=0; i < l.length; i++){
			l[i](args);
		}
	}
	function subscribe(eventName, callback){
		if(!event_listeners[eventName]) event_listeners[eventName] = []
		event_listeners[eventName].push(callback);
	}
	return {
		subscribe: subscribe,
		trigger: trigger
	}
}
navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;
			
function VideoChatClient(){
	var self = this;
	this.vent = new EventDispatcher();
	this.config = { rtc : { "iceServers": [{ "urls": ["stun:stun.l.google.com:19302"] }] }, 
					sdpConstraints : {"offerToReceiveAudio":true,"offerToReceiveVideo":true }
				  };
	this.rtcConnection = null;
	this.socketConnection = io.connect(window.location.protocol+"//"+window.location.host);
	this.socketConnection.on("receive", function(message){
		self.receive(message);
	});
}

VideoChatClient.prototype.on = function(eventName,callback){
	this.vent.subscribe(eventName, callback)
}
			
VideoChatClient.prototype.openDevice = function(){
	var self = this;
	
	navigator.getUserMedia ({audio: true, video:true}, function(localStream) {
		self.videoStream = localStream;
		self.mute();
		self.vent.trigger("deviceReady", {stream: localStream});
	}, function(err){ console.log(err); });
}

VideoChatClient.prototype.startChat = function(){
	var self = this;
	this.socketConnection.emit('search', function(found){
		if(!found){
			return alert('Cannot find any other users');
		}
		self.startRtcConnection();
		var offer = self.rtcConnection.createOffer(function (sdp) { // start negotiation with the remote peer
			self.rtcConnection.setLocalDescription(sdp);
			self.send({"offer": sdp});
		}, function(err){console.log(err); }, self.config.sdpConstraints);
		self.rtcConnection.onicecandidate = function (e) {
			if (!self.rtcConnection || !e || !e.candidate) return;
			var candidate = e.candidate;
			self.send({"iceCandidate": candidate});
		}
	})
	
}
VideoChatClient.prototype.startRtcConnection = function(){
	var self = this;
	this.closeRtcConnection();
	var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	this.rtcConnection = new RTCPeerConnection(this.config.rtc);
	this.rtcConnection.addStream(this.videoStream);
	this.rtcConnection.onaddstream = function(e){
		self.vent.trigger('remoteVideo', {stream:e.stream});
		console.log('another stream recved');
	}
}
VideoChatClient.prototype.closeRtcConnection = function(){
	if(this.rtcConnection)
		this.rtcConnection.close();
	this.rtcConnection = null;
}

VideoChatClient.prototype.send = function(message){
	console.log('sending...' + JSON.stringify(message) + ' to ' + this.remoteUser);
	this.socketConnection.emit('send', message);
};

VideoChatClient.prototype.receive = function(message){
	console.log(message);
	var self = this;
	if('iceCandidate' in message)
		this.rtcConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
	if('answer' in message)
		this.rtcConnection.setRemoteDescription(new RTCSessionDescription(message.answer));	
	if('offer' in message){		
		this.startRtcConnection();
		this.rtcConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
		this.rtcConnection.createAnswer(function (sdp) { // send an answer
			self.rtcConnection.setLocalDescription(sdp);
			self.send({answer: sdp});
		}, function(err){console.log(err); }, this.config.sdpConstraints);
	}
}

VideoChatClient.prototype.mute = function(){
	var audioTracks = this.videoStream.getAudioTracks();
	console.log(audioTracks);
	if (audioTracks[0]) 
		audioTracks[0].enabled = false;
}
