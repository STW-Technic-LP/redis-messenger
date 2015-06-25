var redis = require('redis');
var listener = redis.createClient();
var sender = redis.createClient();

var evts = require('events');
var messenger = new evts.EventEmitter();
var myName;

messenger.send = function(eventName, to, content){
   sender.publish(to, JSON.stringify({
      to: to,
      content: content,
      eventName: eventName,
      from: myName
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

// checks if a channel is still open
messenger.checkState = function(id, callback){
   getChannels(function(channels){
      if(channels.indexOf(id) === -1){
         callback(false);
         return;
      }
      callback(true);
   });
};

messenger.join = function(channel){
   listener.subscribe(channel);
};

messenger.leave = function(channel){
   listener.unsubscribe(channel);
};

module.exports = function(me){
   if(!me){
      me = makeId();
   }
   getChannels(function(channels){
      if(channels.indexOf(me) !== -1){
         var newMe = !!me ? ""+me+makeId() : makeId();
         console.log("Warning: a channel with name \""+me+"\" already Exists... Created new channel: ", newMe);
         if(channels.indexOf(newMe) !== -1){
            throw new Error("Could not randomize unique channel name");
         }
         me = newMe;
      }
      myName = me;
      listener.subscribe(me);
   });

   // FIXME: bug. myName doesnt exist until getChannels (async) is complete.
   return messenger;
};

process.on('SIGINT', function(){
   listener.unsubscribe(messenger.me);
   process.exit();
});

function whoAmI(){
   return myName;
}

// misc functions

function getChannels(callback){
   sender.pubsub('channels', function(a, channels){
      callback(channels || []);
   });
}

function makeId(){
   return Math.random().toString(36).substring(2);
}
