(function(){
   'use strict';

   var workers = {};
   var jobs = {};
   var apps = {};
   var workerProcs = [];
   var jobId = 1;
   var workerTimeout = 60000;
   var averageJobTime = 0;
   var completedJobs = 0;

   var _ = require('lodash');
   var messenger = require('../messenger').create();
   messenger.register('master');
   var childs = require("child_process");
   var client = require('redis').createClient();

   /**********************
   *    WORKER EVENTS    *
   **********************/

   // make the first worker...
   makeWorker();

   // new worker is registering...
   messenger.on('workerRegister', function(data, fromWorker){
      console.log("Worker registering: ", fromWorker);
      if(!fromWorker || !_.isString(fromWorker)){
         console.error("Worker attempted to register, but had invalid name.");
         return;
      }
      workers[fromWorker] = {};
      workers[fromWorker].status = 'idle';
      workers[fromWorker].name = fromWorker; // a bit redundant
      workers[fromWorker].jobId = -1;

      setTimeout(areYouAlive.bind(null, fromWorker), workerTimeout);

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
      console.log(workers);
      workers[fromWorker].status = 'busy';
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

   /**********************
   *    DEVICE EVENTS    *
   **********************/

   messenger.on('appRegister', function(data, fromApp){
      console.log('new app registering (job creator): ', fromApp);

   });

   // received new job request
   messenger.on('jobRequest', function(data, fromDevice){
      data.jobId = jobId;
      data.status = 'queued';
      data.startTime = Date.now();
      data.from = fromDevice;
      jobs[jobId] = data;
      console.log("Received job request: ", jobId);
      assignJob(jobs[jobId]);
      jobId++;
   });

   messenger.on('dataRequest', function(rqst){
      // forward data request to respective device applicationonsole.
      console.log("worker requested data from device");
      messenger.send(jobs[rsqt.jobId].from, "dataRequest", rqst);
   });

   messenger.on('dataResponse', function(data){
      var wId = getWorkerIdByJobId(data.jobId);
      console.log("got requested data from device, sending to worker ", wId);
      messenger.send(wId, "dataResponse", data);
   });

   //messenger.on('sudoku', cleanUpWorker);

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
         messenger.send(worker.name, 'job', job);
         jobs[job.jobId].status = 'assigned';
         workers[worker.name].jobId = job.jobId;
         workers[worker.name].jobStart = Date.now();
      }
   }

   function areYouAlive(workerId){
      messenger.checkState(workerId, function(alive){
         if(alive){
            setTimeout(areYouAlive.bind(null, workerId), workerTimeout);
            return;
         }
         cleanUpWorker(undefined, workerId);
      });
   }

   function updateAverageJobTime(job){
      var diff = Date.now() - job.startTime;
      // make it a moving average
      var numCompleted = completedJobs > 100 ? 100 : completedJobs;
      averageJobTime = ((averageJobTime * (numCompleted-1))+diff)/numCompleted;
      console.log("avg job time is now : ", averageJobTime);
      if(averageJobTime > 20000){
         // reset average job time

         averageJobTime = (averageJobTime*Object.keys(workers).length)/(Object.keys(workers).length + 1);
         // spawn new worker
         makeWorker();
      }
      // ...decided not to kill any workers for now
   }

   function getWorkerIdByJobId(jobId){
      return Object.keys(workers).filter(function(e){
         return workers[e].jobId === jobId;
      })[0];
   }

   function cleanUpWorker(data, workerId){
      console.log("Worker "+workerId+" has died. Cleaning up");
      // free up the job if the worker was working on one
      if(workers[workerId].jobId){
         jobs[workers[workerId].jobId].status = 'queued';
      }
      delete workers[workerId];
   }

   function makeWorker(){
      var newWorker = childs.fork('worker.js', {env: {"WORKER_NAME": "worker"+Object.keys(workers).length}});
      workerProcs.push(newWorker);
   }

   process.on('exit', function(){
      workerProcs.forEach(function(e){
         e.kill('SIGHUP');
      });
      process.exit();
   });

})();
