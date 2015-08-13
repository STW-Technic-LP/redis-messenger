# redis-messenger
This is a message library that uses Redis pub/sub to provide intercommunication for node apps.  It doesn't setup any sort of master/slave relationship model, but just sends and receives messages.

As per redis pub/sub functionality, messages are not stored in memory.  If a message was sent to a channel that has no one listening, the message won't be queued, it will just be lost.

This package has one dependency, the lovely [node_redis](https://github.com/NodeRedis/node_redis).

## Install

npm install redis-messenger

## API

### create([port [, host [, options]]])
Create a new redis messenger object.  The defaults are

```json
{
  "port":6379,
  "host":"127.0.0.1",
  "options":{}
}
```

The properties of the options object can be found on [node redis repo](https://github.com/NodeRedis/node_redis#rediscreateclient)

```javascript
var messenger = require('redis-messenger').create()
```

### register(appName [, callback])
Registering sets your messenger up with a unique channel name that it can receive messages on.  When you `send` messages, the "sender" will be the name you registered, so that if the receiver would like to respond directly, it can do so by `send`ing to that channel.  To retrieve your name, see the `whoAmI` command

```javascript
messenger.register('myAppName');
```

The callback receives 1 parameter that is the resulting application name that was used for registration.  It may not be what you registered as, since that channel may be taken by another application already.

Currently, an application can `join` a channel that another app has registered to. It was left this way to provide more flexibility for those edge cases.

Q: Why not register using the create command?  
A: Registering is an asynchronous function which require() cannot do.

### send(to, eventName [, content])
Send a message to a channel.  All applications that have joined the channel can receive the event.

```javascript
messenger.send('someApp', 'moshimoshi', { foo: 'bar' });
```

The send command will wait until your application has successfully registered with a name.  This is because the receiver needs an application name to respond to.  Once you have registered, the messages will automatically be sent.

Note: It is possible to send to channels that have no listeners.  The message will just be thrown away as this is how Redis pub/sub  works.

### isAlive(id, callback)
Checks if a channel has been joined by anyone or not.  The callback receives a single boolean parameter.  It is true if the channel has been joined to, false otherwise.

```javascript
messenger.isAlive('someChannel', function(aliveness){ ... });
```

### join(channel)
Joins a channel to listen to events.

```javascript
messenger.join('someChannel');
```

An app can join a channel that has been registered to.

### leave(channel)
Leaves a channel that was subscribed to

```javascript
messenger.leave('someChannel');
```

### unregister()
Leaves the channel that the application was registered to.

```javascript
messenger.unregister();
```

Warning: This removes the unique channel joining feature.  This is available to provide more flexibility in the use of redis-messenger.

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
