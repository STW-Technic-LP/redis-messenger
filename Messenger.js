const { EventEmitter } = require('events');

class Messenger extends EventEmitter {
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
   broadcast(eventName, eventData) {
      if (!this.broadcastRoom) {
         throw new Error("You must set the broadcast room first by calling .setBroadcastRoom");
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
   send(to, eventName, content) {
      let myId = this.myId;
      if (!myId) {
         this.sendQueue.push({
            to: to,
            data: {
               content: content,
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
   isAlive(id, callback) {
      this.getChannels(function (channels) {
         if (channels.indexOf(id) === -1) {
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
   join(channel) {
      this.listener.subscribe(channel);
   }

   /**
    *
    * @param {string} channel
    */
   leave(channel) {
      this.listener.unsubscribe(channel);
   }

   /**
    *
    * @param {string} [idPrefix] - a string to prefix to unique instance/channel id;
    * @param {(myInstanceId: string) => void} [cb] - callback fn to receive the instance id; also returned by .whoAmI()
    */
   register(idPrefix, cb) {
      this.registering = true;
      let myUniqueId = makeId(idPrefix);
      this.getChannels((channels) => {
         if (channels.indexOf(myUniqueId) !== -1) {
            var newMe = makeId(idPrefix); // !!me ? "" + me + makeId() : makeId();
            //console.log("Warning: a channel with name \"" + me + "\" already Exists... Created new channel: ", newMe);
            if (channels.indexOf(newMe) !== -1) {
               throw new Error("Could not randomize unique channel name");
            }
            myUniqueId = newMe;
         }
         this.myId = myUniqueId;
         this.listener.subscribe(myUniqueId);
         //console.log('Registered as ' + this.myId);
         this.flushSendQueue();
         if (cb) {
            cb(this.myId);
         }
      });
   };

   // using this function will prevent messenger from receiving events on its channel
   unregister() {
      this.myId && this.listener.unsubscribe(this.myId);
   };

   /**
    *
    * @returns Returns my instance id (aka channel name)
    */
   whoAmI() {
      return this.myId;
   };

   // misc functions
   /**
    * @private
    */
   flushSendQueue() {
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
   getChannels(callback) {

      this.sender.pubsub('channels', function (a, channels) {
         callback(Array.isArray(channels) ? channels.map(String) : [channels].map(String));
      });
   }
};

/**
 * 
 * @param {string} [prefix] 
 * @returns 
 */
function makeId(prefix) {
   return (typeof prefix === "string" ? prefix : "") 
      +  new Date().getTime().toString(36) + Math.random().toString(36).substring(2);
}

module.exports = Messenger;
