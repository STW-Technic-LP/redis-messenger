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
   var messenger = require('../messenger')(me);


   messenger.send('workerRegister', master, {
      name: messenger.me
   });

   messenger.on('job', function(data){
      //if(timeoutId) {
      //   clearTimeout(timeoutId);
      //}

      console.log("Got job: ", data.jobId);
      curJob = data.jobId;
      messenger.send('workerAck', master, {
         jobId: data.jobId
      });

      messenger.send('dataRequest', master, {
         jobId: curJob
      });

      messenger.on('dataResponse', function(data){
         console.log('got data from master: ', data);
         finishJob(curJob);
      });
   });

   function finishJob(id){
      console.log("Finished job: ", id);
      messenger.send("workerDone", master, {
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

})();
