(function(){
   'use strict';
   var master = 'master';
   var me = process.env.WORKER_NAME;
   function timeToComplete(){
      return Math.floor(Math.random()*10000)+1;
   }
   var messenger = require('../messenger')(me);

   messenger.send('workerRegister', master, {
      name: messenger.me
   });


   messenger.on('job', function(data){
      console.log("Got job: ", data.jobId);
      messenger.send('workerAck', master, {
         jobId: data.jobId
      });

      setTimeout(function(){
         console.log("Finished job: ",  data.jobId);
         messenger.send("workerDone", master, {
            jobId: data.jobId
         });
      }, 5000);
   });

})();
