# redis-messenger
This library uses Redis pub/sub to provide communication for node apps

## Install

npm install redis-messenger

## Api

### create()
Create a new redis messenger object.

```javascript
var messenger = require('redis-messenger').create()
```

### register(appName [, callback])
Registering sets your messenger up with a pseudo-unique channel name that it can receive messages on.  To retrieve your name, see the whoAmI command.

```javascript
messenger.register('myAppName');
```

The callback receives 1 parameter that is the resulting application name that was used for registration.  It may not be what you registered as, since that channel may be taken by another application already.

Why not register using the create command?  Registering is an asynchronous function which require() cannot do.

### send(to, eventName, content)
Send a message to a channel

```javascript
messenger.send('someApp', 'moshimoshi', { foo: 'bar' });
```

The send command will wait until your application has successfully registered with a name.  This is because the receiver needs an application name to respond to.  Once you have registered, the messages will automatically be sent.

Note: It is possible to send to channels that have no listeners.  The message will just be thrown away as this is how Redis pub/sub  works.

### isAlive(id, callback)
Checks if a channel is open or not.  The callback receives a single boolean parameter

```javascript
messenger.isAlive('someChannel', function(aliveness){ ... });
```

### join(channel)
Joins a channel to listen to events

```javascript
messenger.join('someChannel');
```

### leave(channel)
Leaves a channel that was subscribed to

```javascript
messenger.leave('someChannel');
```

### unregister()
Leaves the channel that the application was registered to.

```javascript
messenger.unregister('someChannel');
```

Warning: This removes the unique channel joining feature.

## Handle Messages
The messenger is simply an [EventEmitter](https://nodejs.org/api/events.html#events_class_events_eventemitter), so all events are handled accordingly.

For each message, the callback receives the content, sender address, and channel.

```javascript
messenger.on('someEventName', function(data, sender, channel){
  console.log(sender+"sent a message over channel "+channel+":", data);
});
```

## Example

#### fooApp.js

```javascript
var messenger = require('redis-messenger').create();
// register to a specific channel
messenger.register('fooApp');

messenger.on('ping', function(data, sender){
   console.log(sender, ': ping');
   console.log('fooApp : pong');
   messenger.send(sender, 'pong');
});
```

#### barApp.js

```javascript
var messenger = require('redis-messenger').create();
// register to a specific channel
messenger.register('barApp');

messenger.on('pong', function(data, sender){
   console.log(sender, ': pong');
});

setInterval(function(){
   console.log("barApp : ping");
   messenger.send('fooApp', 'ping');
}, 5000);
```

## License

Copyright (c) 2015 Brett Berry

Released under the MIT license.
