var redis = require('redis');
var listener;
var sender;
var evts = require('events');
var messenger = new evts.EventEmitter();
var myName;
var sendQueue = [];
var registering = false;

messenger.send = function(to, eventName, content){
   if(!myName){
      sendQueue.push({
         to: to,
         data: {
            content:content,
            eventName: eventName
         }
      });
      var emsg = registering ? 'In the process of registering.' : "Cannot send without registering.";
      emsg += " Messages will automatically be sent when registered.";
      console.error(emsg);
      return new Error(emsg);
   }
   sender.publish(to, JSON.stringify({
      content: content,
      eventName: eventName,
      from: myName,
   }));
};


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

// idea: create/return a new client for join?
messenger.join = function(channel){
   listener.subscribe(channel);
};

messenger.leave = function(channel){
   listener.unsubscribe(channel);
};

messenger.register = function(me, cb){
   registering = true;
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
      console.log('Registered as '+myName);
      flushSendQueue();
      if(cb){
         cb(myName);
      }
   });
};

// using this function will prevent messenger from receiving events on its channel
messenger.unregister = function(){
   listener.unsubscribe(myName);
};

messenger.whoAmI = function(){
   return myName;
};

module.exports = {
   create: function(port, host, options){
      listener = redis.createClient(port, host, options);
      sender = redis.createClient(port, host, options);

      listener.on('message', function(channel, message){
         var msg;
         try {
            msg = JSON.parse(message);
         } catch(e){
            console.error(e);
            return console.error("Message Contents:", message);
         }
         messenger.emit(msg.eventName, msg.content, msg.from, channel);
      });

      return messenger;
   }
};

// misc functions

function flushSendQueue(){
   sendQueue.forEach(function(msg){
      msg.data.from = myName;
      console.log('flushing: ', msg);
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
