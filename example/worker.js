(function(){
   'use strict';
   var master = 'master';
   var me = process.env.WORKER_NAME;
   var curJob;

   //var jobAssignTimeout = 30000;
   //var timeoutId;

   function timeToComplete(){
      return Math.floor(Math.random()*10000)+1;
   }
   var messenger = require('../messenger').create();
   messenger.register(me);

   messenger.send(master, 'workerRegister');

   messenger.on('job', function(data){
      console.log('i am: ', messenger.whoAmI());
      //if(timeoutId) {
      //   clearTimeout(timeoutId);
      //}

      console.log("Got job: ", data.jobId);
      curJob = data.jobId;
      messenger.send(master, 'workerAck', {
         jobId: data.jobId
      });

      messenger.send(master, 'dataRequest', {
         jobId: curJob
      });

      messenger.on('dataResponse', function(data){
         console.log('got data from master: ', data);
         finishJob(curJob);
      });
   });

   function finishJob(id){
      console.log("Finished job: ", id);
      messenger.send(master, "workerDone", {
         jobId: id
      });

      /* Removed this... no need to kill a worker...yet
      // haven't received a job in a while, I'm not needed
      timeoutId = setTimeout(function(){
         messenger.send("sudoku", master);
         process.exit();
      }, jobAssignTimeout);
      */
   }

   process.on('SIGHUP', function(){
      console.log('got sighup');
   });

   process.on('SIGINT', function(){
      console.log('got sighup');
   });

})();
