const redis = require('redis');
const events = require('events');

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

class Messenger extends events.EventEmitter {
   /**
    * 
    * @param {import("redis").RedisClient} sender 
    * @param {import("redis").RedisClient} listener 
    */
   constructor(sender, listener) {
      super();
      
      /**
       * @private
       */
      this.sender = sender;

      /**
       * @private
       */
      this.listener = listener;

      /**
       * @private
       * @type {string | undefined}
       */
      this.myId = undefined;

      /**
       * @private
       * @type {{to: any, data: {from?: any, content: any, eventName: string}}[]}
       */
      this.sendQueue = [];

      /**
       * @private
       */
      this.registering = false;

      /**
       * @private
       */
      this.broadcastRoom = "";
   }

   /**
    * @param {string} val
    */
   setBroadcastRoom(val) {
      this.broadcastRoom = val;
   }

   /**
    * 
    * @param {string} eventName 
    * @param {any} eventData 
    */
   broadcast(eventName, eventData){
      if (!this.broadcastRoom) {
         throw new Error("You must set the broadcast room first by calling .setBroadcastRoom")
      }
      this.send(this.broadcastRoom, eventName, eventData);
   };

   /**
    * 
    * @param {*} to - channel to publish to 
    * @param {*} eventName 
    * @param {*} content 
    * @returns 
    */
   send(to, eventName, content){
      let myId = this.myId;
      if(!myId){
         this.sendQueue.push({
            to: to,
            data: {
               content:content,
               eventName: eventName
            }
         });
         var emsg = this.registering ? 'In the process of registering.' : "Cannot send without registering.";
         emsg += " Messages will automatically be sent when registered.";
         console.error(emsg);
         return new Error(emsg);
      }
      this.sender.publish(to, JSON.stringify({
         content: content,
         eventName: eventName,
         from: myId,
      }));
   }


   /**
    * checks if a channel is still open
    * @param {string} id 
    * @param {(alive: boolean) => void} callback 
    */
   isAlive(id, callback){
      this.getChannels(function(channels){
         if(channels.indexOf(id) === -1){
            callback(false);
            return;
         }
         callback(true);
      });
   }

   // idea: create/return a new client for join?
   /**
    * 
    * @param {string} channel 
    */
   join(channel){
      this.listener.subscribe(channel);
   }

   /**
    * 
    * @param {string} channel 
    */
   leave(channel){
      this.listener.unsubscribe(channel);
   }

   /**
    * 
    * @param {string} me - my instance id; auto generated if not given
    * @param {(myInstanceId: string) => void} cb 
    */
   register(me, cb){
      this.registering = true;
      if(!me){
         me = makeId();
         console.log("No name given, generating random name: ", me);
      }
      this.getChannels((channels) => {
         if(channels.indexOf(me) !== -1){
            var newMe = !!me ? ""+me+makeId() : makeId();
            console.log("Warning: a channel with name \""+me+"\" already Exists... Created new channel: ", newMe);
            if(channels.indexOf(newMe) !== -1){
               throw new Error("Could not randomize unique channel name");
            }
            me = newMe;
         }
         this.myId = me;
         this.listener.subscribe(me);
         console.log('Registered as '+ this.myId);
         this.flushSendQueue();
         if(cb){
            cb(this.myId);
         }
      });
   };

   // using this function will prevent messenger from receiving events on its channel
   unregister(){
      this.myId && this.listener.unsubscribe(this.myId);
   };

   /**
    * 
    * @returns Returns my instance id (aka channel name)
    */
   whoAmI(){
      return this.myId;
   };

   // misc functions

   /**
    * @private
    */
   flushSendQueue(){
      this.sendQueue.forEach((msg) => {
         msg.data.from = this.myId;
         console.log('flushing: ', msg);
         this.sender.publish(msg.to, JSON.stringify(msg.data));
      });
      this.sendQueue.splice(0, this.sendQueue.length);
   }

   /**
    * 
    * @param {(channels: string[]) => void} callback 
    */
   getChannels(callback){
   
      this.sender.pubsub('channels', function(a, channels){
         callback(Array.isArray(channels) ? channels.map(String) : [channels].map(String));
      });
   }
};


function makeId(){
   return new Date().getTime().toString(36) + Math.random().toString(36).substring(2);
}
