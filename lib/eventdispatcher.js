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

exports = module.exports = EventDispatcher;