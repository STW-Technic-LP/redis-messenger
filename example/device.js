(function(){
   'use strict';
   var me = process.env.DEVICE_NAME;

   var messenger = require('../messenger')(me);

   //setInterval(function(){
   //   console.log("Sending job request");
      messenger.send('jobRequest', 'master', {
         timestamp: Date.now(),
         event: 'doSomething',
         content: {
         }
      });

      messenger.on('dataRequest', function(data){
         console.log('worker wants some data, sending it some...');
         // master wants some data from us. lets get it for them
         //fake getting data...
         var responseData = {foo: 'bar'};
         // ...got data, respond.
         messenger.send('dataResponse', 'master', {
            foo: 'bar',
            jobId: data.jobId
         });

      });

})();
