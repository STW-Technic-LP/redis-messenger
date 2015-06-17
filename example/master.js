(function(){
   'use strict';

   var workers = {};
   var jobs = {};
   var jobId = 1;
   var workerTimeout = 60000;
   var averageJobTime = 0;
   var completedJobs = 0;

   var _ = require('lodash');
   var messenger = require('../messenger')('master');
   var spawner = require("child_process").spawn;

   // new worker is registering...
   messenger.on('workerRegister', function(data){
      console.log("Worker registering: ", data.name);
      if(!data.name || !_.isString(data.name)){
         return;
      }
      workers[data.name] = data;
      workers[data.name].status = 'idle';
      workers[data.name].jobId = -1;

      setTimeout(areYouAlive.bind(null, data.name), workerTimeout);

      var job = getFirstQueued();
      if(job){
         assignJob(job);
      }
   });

   // received new job request
   messenger.on('jobRequest', function(data){
      data.jobId = jobId;
      data.status = 'queued';
      data.startTime = Date.now();
      jobs[jobId] = data;
      console.log("Received job request: ", jobId);
      assignJob(jobs[jobId]);
      jobId++;
   });

   // worker has completed a job
   messenger.on('workerDone', function(data, fromWorker){
      if(workers[fromWorker].status !== 'busy'){
         return;
      }
      workers[fromWorker].status = 'idle';
      var workerJobId = workers[fromWorker].jobId;
      jobs[workerJobId].status = 'completed';
      completedJobs++;
      updateAverageJobTime(jobs[workerJobId]);
      workers[fromWorker].jobId = -1;
      console.log("Worker "+fromWorker+" completed job "+workerJobId);
      var job = getFirstQueued();
      if(job){
         assignJob(job);
      }
   });

   // worker has received a job successfully
   messenger.on('workerAck', function(data, fromWorker){
      if(!jobs[data.jobId]){
         console.log(new Error("Got workerAck but job not found..."));
         return;
      }
      console.log("Worker "+fromWorker+" accepted job: "+data.jobId);
      workers[fromWorker].status = 'busy';
   });

   // misc
   function getIdle(){
      var wKey = _.findKey(workers, function(worker){
         return worker.status === 'idle' && worker.jobId === -1;
      });
      return workers[wKey];
   }

   function getFirstQueued(){
      var jobKey = _.findKey(jobs, function(e){
         return e.status === 'queued';
      });
      return jobs[jobKey] || false;
   }

   function assignJob(job){
      var worker = getIdle();
      if(worker){
         console.log("Assigning job "+job.jobId+" to worker "+worker.name);
         messenger.send('job', worker.name, job);
         jobs[job.jobId].status = 'assigned';
         workers[worker.name].jobId = job.jobId;
      }
   }

   function areYouAlive(workerId){
      messenger.checkState(workerId, function(alive){
         if(alive){
            setTimeout(areYouAlive.bind(null, workerId), workerTimeout);
            return;
         }
         console.log("Worker "+workerId+" has died. Cleaning up");
         // free up the job if the worker was working on one
         if(workers[workerId].jobId){
            jobs[workers[data.name].jobId].status = 'queued';
         }
         delete workers[workerId];

      });
   }

   function updateAverageJobTime(job){
      var diff = Date.now() - job.startTime;
      var numCompleted = completedJobs > 100 ? 100 : completedJobs;
      averageJobTime = ((averageJobTime * (numCompleted-1))+diff)/numCompleted;
      console.log("avg job time is now : ", averageJobTime);
      if(averageJobTime > 20000){
         averageJobTime = 12500;
         // spawn new worker
         spawner('node', ['worker.js']);
      }
      else if(averageJobTime < 5000){
         // kill a worker
         /******************* WORK ON KILLING THE SPAWNED NODE APPS */
      }
   }
})();
