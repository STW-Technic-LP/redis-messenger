var messenger = require('../../messenger.js').create();
// register to a specific channel
messenger.register('fooApp');

// join another channel
messenger.join('global');

var somePrivateData = {
   password: 'soupur scekrit'
};

messenger.on('ping', function(data, sender){
   console.log(sender, ': ping');
   console.log('fooApp : pong');
   messenger.send(sender, 'pong');
});

messenger.on('gibDataPlz', function(data, sender, channel){
   if(channel === 'global'){
      var response = "I only accept private requests";
      console.log('Got global message, sending Response: ', response);
      return messenger.send('global', 'goAway', 'I only accept private requests');
   }
   console.log("Got request for data from "+sender+" over channel "+channel);
   messenger.send(sender, 'hereYouGo', somePrivateData);
});
