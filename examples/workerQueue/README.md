!!!NOTE!!!
This example is out of date... updates coming..

# Example

This is an example usage for redis-messenger.  The device application sends events to the master as jobs.  The master then determines what workers are available to be given a job and assigns a worker with that job.  If there are no workers or all the workers are busy, the job will be added to a queue.  Once a worker is available, the job will be assigned and removed from the queue.

When a worker completes the job, it notifies the master application and awaits the next job to be assigned.

## master

The __master__ application is the coordinator
