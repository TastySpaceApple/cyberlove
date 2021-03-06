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
	this.socketConnection.on("video-signal", function(message){
		self.processSignal(message);
	});
	this.socketConnection.on('chat-message', function(message){
		self.vent.trigger('chatMessage', {messageText: message});
	});
}

VideoChatClient.prototype.on = function(eventName,callback){
	this.vent.subscribe(eventName, callback)
}
			
VideoChatClient.prototype.openDevice = function(){
	var self = this;
	
	navigator.getUserMedia ({audio: true, video:true}, function(localStream) {
		self.videoStream = localStream;
		//self.mute();
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
			self.sendSignal({"offer": sdp});
		}, function(err){console.log(err); }, {"offerToReceiveAudio":true,"offerToReceiveVideo":true });
	})
	
}

VideoChatClient.prototype.sendChatMessage = function(msg){
	this.socketConnection.emit('chat-message', msg);
}

VideoChatClient.prototype.startRtcConnection = function(){
	var self = this;
	this.closeRtcConnection();
	var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	this.rtcConnection = new RTCPeerConnection(this.config.rtc);
	this.rtcConnection.addStream(this.videoStream);
	this.rtcConnection.onaddstream = function(e){
		self.vent.trigger('remoteVideo', {stream:e.stream});
		console.log('stream recved');
	}
	this.rtcConnection.onicecandidate = function (e) {
		if (!self.rtcConnection || !e || !e.candidate) return;
			var candidate = e.candidate;
			self.sendSignal({"iceCandidate": candidate});
	}
}
VideoChatClient.prototype.closeRtcConnection = function(){
	if(this.rtcConnection)
		this.rtcConnection.close();
	this.rtcConnection = null;
}

VideoChatClient.prototype.sendSignal = function(message){
	console.log('sending...' + JSON.stringify(message) + ' to ' + this.remoteUser);
	this.socketConnection.emit('video-signal', message);
};

VideoChatClient.prototype.processSignal = function(message){
	console.log(message);
	var self = this;
	if('iceCandidate' in message)
		this.rtcConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
	if('answer' in message)
		this.rtcConnection.setRemoteDescription(new RTCSessionDescription(message.answer));	
	if('offer' in message){		
		this.startRtcConnection();
		console.log(this.config.sdpConstraints);
		this.rtcConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
		this.rtcConnection.createAnswer(function (sdp) { // send an answer
			self.rtcConnection.setLocalDescription(sdp);
			self.sendSignal({answer: sdp});
		}, function(err){console.log(err); }, { mandatory: { OfferToReceiveAudio: true, OfferToReceiveVideo: true } });
	}
}

VideoChatClient.prototype.toggleAudio = function(){
	var audioTracks = this.videoStream.getAudioTracks();
	if (audioTracks[0]) {
		audioTracks[0].enabled = !audioTracks[0].enabled;
		return audioTracks[0].enabled;
	}
	return false;
}
VideoChatClient.prototype.toggleVideo = function(){
	var videoTracks = this.videoStream.getVideoTracks();
	if (videoTracks[0]) {
		videoTracks[0].enabled = !videoTracks[0].enabled;
		return videoTracks[0].enabled;
	}
	return false;
}

VideoChatClient.prototype.hasVideo = function(){
	var videoTracks = this.videoStream.getVideoTracks();
	if (videoTracks[0]) 
		return true;
	return false;
}

VideoChatClient.prototype.hasAudio = function(){
	var audioTracks = this.videoStream.getAudioTracks();
	if (audioTracks[0])
		return true;
	return false;
}