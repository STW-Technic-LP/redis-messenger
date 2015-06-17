var redis = require('redis');
var listener = redis.createClient();
var sender = redis.createClient();

var evts = require('events');
var messenger = new evts.EventEmitter();
var messageList = {};

messenger.send = function(eventName, to, content){
   sender.publish(to, JSON.stringify({
      to: to,
      content: content,
      eventName: eventName,
      from: messenger.me
   }));
};

listener.on('message', function(channel, message){
   var msg;
   try {
      msg = JSON.parse(message);
   } catch(e){
      console.log("Could not parse message:", message);
      return;
   }
   messenger.emit(msg.eventName, msg.content, msg.from);
});

messenger.checkState = function(id, callback){
   getChannels(function(channels){
      if(channels.indexOf(id) === -1){
         callback(false);
         return;
      }
      callback(true);
   });
};

module.exports = function(me){
   if(!me){
      me = makeId();
   }
   getChannels(function(channels){
      if(channels.indexOf(me) !== -1){
         console.log("Warning: a channel with name \""+me+"\" already Exists... Assigning another channel");
         me = makeId();
         if(channels.indexOf(me) !== -1){
            throw new Error("Could not randomize unique channel name");
         }
      }
      listener.subscribe(me);
   });
   messenger.me = me;
   return messenger;
};

process.on('SIGINT', function(){
   listener.unsubscribe(messenger.me);
   process.exit();
});

// misc functions

function getChannels(callback){
   sender.pubsub('channels', function(a, channels){
      callback(channels || []);
   });
}

function makeId(){
   return Math.random().toString(36).substring(2);
}
