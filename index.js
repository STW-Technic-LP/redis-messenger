const redis = require('redis');
const Messenger = require("./messenger");

module.exports = {
   /**
    * Creates and returns a messenger instance 
    * @param {number} port - defaults to 6379
    * @param {string} host - defaults to "127.0.0.1"
    * @param {import("redis").ClientOpts} [options]
    */
   create: function(port, host, options){

      const listener = redis.createClient(port||6379, host||'127.0.0.1', options);
      const sender = redis.createClient(port||6379, host||'127.0.0.1', options);

      const messenger = new Messenger(sender, listener);
   
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


