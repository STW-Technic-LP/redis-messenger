var redis = require('redis');
var listener = redis.createClient();
var sender = redis.createClient();

var evts = require('events');
var messenger = new evts.EventEmitter();
var myName;
var sendQueue = [];

messenger.send = function(to, eventName, content){
   if(!myName){
      sendQueue.push({
         to: to,
         data: {
            content:content,
            eventName: eventName
         }
      });
      var emsg = "Cannot send without registering yourself. This will send automatically when registered!";
      console.error(emsg);
      return new Error(emsg);
   }
   sender.publish(to, JSON.stringify({
      content: content,
      eventName: eventName,
      from: myName,
   }));
};

listener.on('message', function(channel, message){
   var msg;
   try {
      msg = JSON.parse(message);
   } catch(e){
      console.error(e);
      return console.error("Message Contents:", message);
   }
   messenger.emit(msg.eventName, msg.content, msg.from);
});

// checks if a channel is still open
messenger.isAlive = function(id, callback){
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

messenger.register = function(me){
   console.log('registering as: ', me);
   if(!me){
      me = makeId();
      console.log("No name given, generating random name: ", me);
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
      flushSendQueue();
   });
};

messenger.whoAmI = function(){
   return myName;
};

module.exports = {
   create: function(){
      return messenger;
   }
};

process.on('SIGINT', function(){
   console.log("got SIGINT from: ", myName);
   if(myName){
      console.log("unsubscribing from:", myName);
      listener.unsubscribe(myName);
   }
   process.exit();
});

process.on('SIGTERM', function(){
   console.log("got SIGTERM");
   if(myName){
      console.log("unsubscribing from:", myName);
      listener.unsubscribe(myName);
   }
   process.exit();
});

process.on('SIGHUP', function(){
   console.log("got SIGHUP");
   if(myName){
      console.log("unsubscribing from:", myName);
      listener.unsubscribe(myName);
   }
   process.exit();
});



// misc functions

function flushSendQueue(){
   sendQueue.forEach(function(msg){
      msg.data.from = myName;
      sender.publish(msg.to, JSON.stringify(msg.data));
   });
   sendQueue = [];
}

function getChannels(callback){
   sender.pubsub('channels', function(a, channels){
      callback(channels || []);
   });
}

function makeId(){
   return Math.random().toString(36).substring(2);
}
