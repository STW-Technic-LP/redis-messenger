var messenger = require('../../messenger.js').create();
// register to a specific channel
messenger.register('barApp');

// join another channel
messenger.join('global');

messenger.send('global', 'hi');

messenger.send('fooApp', 'gibDataPlz');

messenger.on('hereYouGo', hackSecretLab);

function hackSecretLab(data){
   console.log("Mwahahaha got secret password ("+data.password+"), time to haxx0rz");
   var pw = data.password;
   // TODO: log into lab and rm -rf /
}

messenger.on('pong', function(data, sender){
   console.log(sender, ': pong');
});

setInterval(function(){
   console.log("barApp : ping");
   messenger.send('fooApp', 'ping');
}, 5000);
