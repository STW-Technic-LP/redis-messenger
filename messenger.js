var redis = require('redis');
var listener = redis.createClient();
var sender = redis.createClient();

var evts = require('events');
var messenger = new evts.EventEmitter();
var messageList = {};
var me;

messenger.send = function(eventName, to, content){
   var toSend = {
      to: to,
      content: content,
      eventName: eventName,
      from: messenger.me
   };
   sender.publish(to, JSON.stringify(toSend));
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

module.exports = function(me){
   if(!me){
      throw new Error("Client name required for messenger");
   }
   listener.pubsub('numsub', me, function(ch, d){
      if(d[1] !== 0){
         throw new Error("A client has already registered with this identifier: "+ch+", "+d);
      }
      listener.subscribe(me);
//      console.log('New messenger listening on channel: ', me);
   });

   messenger.me = me;
   return messenger;
};

process.on('SIGINT', function(){
   listener.unsubscribe(messenger.me);
   process.exit();
});
