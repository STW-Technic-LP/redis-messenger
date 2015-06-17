(function(){
   'use strict';
   var me = process.env.DEVICE_NAME;

   var messenger = require('../messenger')(me);

   setInterval(function(){
      console.log("Sending job request");
      messenger.send('jobRequest', 'master', {
         timestamp: Date.now(),
         event: 'doSomething',
         content: {
            foo: "bar"
         }
      });
   }, 1000);

})();
