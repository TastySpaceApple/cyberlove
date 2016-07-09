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
	this.socketConnection.on('chat-end', function(){
    self.vent.trigger('chatEnd');
		self.closeRtcConnection();
	});
  console.log('started');
  this.socketConnection.on('chat-start', function(name){
    self.vent.trigger('chatStart', {partnerName:name})
    console.log(name);
		self.startChat();
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
  self.startRtcConnection();
  var offer = self.rtcConnection.createOffer(function (sdp) { // start negotiation with the remote peer
    self.rtcConnection.setLocalDescription(sdp);
    self.sendSignal({"offer": sdp});
  }, function(err){console.log(err); }, {"offerToReceiveAudio":true,"offerToReceiveVideo":true });
}
VideoChatClient.prototype.next = function(){
	this.closeRtcConnection();
  this.socketConnection.emit('next');
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
  this.vent.trigger('remoteVideo', {stream:null});

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
    self.vent.trigger('chatStart', {partnerName: message.partnerName})
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

var client;
var chatContainer = document.getElementById('chat_text_messages');
function init(){
  chatContainer = document.getElementById('chat_text_messages');
	client = new VideoChatClient(name);
	client.on('deviceReady', function(e){
		document.getElementById('local_video').src = window.URL.createObjectURL(e.stream);
		document.getElementById('local_video').play();
		document.getElementById('local-audio-toggle').setAttribute('data-toggle', client.hasAudio());
		document.getElementById('local-video-toggle').setAttribute('data-toggle', client.hasVideo());
	});
	client.on('remoteVideo', function(e){
		console.log(e.stream);
    if(e.stream == null){
      document.getElementById("received_video").style.visibility = 'hidden';
    } else{
      document.getElementById("received_video").style.visibility = 'inherit';
      document.getElementById("received_video").src = window.URL.createObjectURL(e.stream);
      document.getElementById("received_video").play();
      if(document.getElementById('floating_start'))
        document.getElementById('floating_start').remove();
    }
		
	});
	client.on('chatMessage', function(e){
		addMessage('chat-message-partner', e.messageText);
	});
  client.on('chatStart', function(e){
    document.getElementById('partner-name').textContent = e.partnerName;
  });
  client.on('chatEnd', function(e){
    document.getElementById('partner-name').innerHTML = '';
  });
	client.openDevice();
	document.getElementById('btnStart').addEventListener('click', function(){
		client.next();
		document.getElementById('floating_start').remove();
	});
  document.getElementById('btnNext').addEventListener('click', function(){
		client.next();
		document.getElementById('floating_start').remove();
	});
	//document.getElementById('chat_window').style.width = window.innerHeight * .8 * 4/3;
	
	document.getElementById('chat_text_message_form').addEventListener('submit', function(e){
		e.preventDefault();
		var text = document.getElementById('chat_text_message_box').value;
		if(/\w/g.test(text)){
			addMessage('chat-message-user', text);
			client.sendChatMessage(text);
			document.getElementById('chat_text_message_box').value = '';
		}
		return false;
	});
	
	document.getElementById('local-audio-toggle').addEventListener('click', function(e){
		e.preventDefault();
		this.setAttribute('data-toggle', client.toggleAudio());
		return false;
	});
	document.getElementById('local-video-toggle').addEventListener('click', function(e){
		e.preventDefault();
		this.setAttribute('data-toggle', client.toggleVideo());
		return false;
	});
}

function addMessage(className, msg){
	var msgDiv = document.createElement('div');
	msgDiv.textContent = msg;
	msgDiv.className = className;
	chatContainer.appendChild(msgDiv);
	chatContainer.scrollTop = chatContainer.scrollHeight;
}

window.addEventListener('load', init);