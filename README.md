# iscomposing.js

JavaScript implementation of "Indication of Message Composition for Instant Messaging" ([RFC 3994](https://tools.ietf.org/html/rfc3994)).

Useful to add the common "is typing" feature into your existing chat.


## Installation

### **npm**:

```bash
$ npm install iscomposing --save
```

And then:

```javascript
var iscomposing = require('iscomposing');
```


## Browserified library

Take the browserified version of the library at `dist/iscomposing.js`. It exposes the global `window.iscomposing` module.

```html
<script type='text/javascript' src='js/iscomposing.js'></script>
```


## Documentation

*NOTE:* The **iscomposing.js** library uses the [mimemessage](https://github.com/eface2face/mimemessage.js/) library within the API it provides. 


### `iscomposing` API

The top-level module exported by the library is an object exporting both the `Composer` and the `Receiver` classes described below.

```javascript
var composer = new iscomposing.Composer();
var receiver = new iscomposing.Receiver();
```


### `iscomposing.Composer` Class API

A `Composer` instance manages the composing status of the local peer.

```javascript
var composer = new iscomposing.Composer(options)
```

`options` is an optional object with the following fields:

* `format` (String): Whether to use XML payload for "status" messages (as the [RFC 3994](http://tools.ietf.org/html/rfc3994) defines) or custom JSON payloads. Valid values are "xml" (default value) and "json".
* `refreshInterval` (Number): Interval for sending "active status" messages (in seconds). Default value is 120. Minimum value is 30.
* `idleTimeout` (Number): Timeout for sending "idle status" message if the apps stops composing its message (in seconds). Default value is 15. Minimum value is 5.

```javascript
var composer = new iscomposing.Composer({
    format: 'json',
    refreshInterval: 60
});
```


#### Methods


##### `composer.composing(statusContentType)`

Tell the composer that a message is being composed.

 * `statusContentType` (String): Optional string indicating the type of message being composed. Default value is "text".

```javascript
// When the user types into the chat text input:
composer.composing();
```

The app should call this method whenever the user types into the text input of the chat.


##### `composer.sent()`

Tell the composer that the composed message was sent.

```javascript
// When the user uses clicks on "Send" button:
myChat.send({
    contentType: 'text/plain',
    body: text
});
composer.sent();
```

The app should call this method whenever a message (other than a "status" message) is sent to the remote peer.


##### `composer.idle()`

Tell the composer that the user is no longer typing or composing a message.

```javascript
// When the chat text input looses the focus:
composer.idle();
```

The app should call this method whenever the user was writting into the chat text input and clicked elsewhere before sending the ongoing text, or also when he suddenly deletes all the text previously written in the chat input.


##### `composer.close()`

Tell the composer that our chat side is closed. No more events will be fired unless the app reactivates it by calling any API method again.

```javascript
// When the chat window is closed.
composer.close();
```

The app should call this method when, for example, the chat window is closed or the chat itself ends.


#### Events


The `Composer` class inherits from the Node [EventEmitter](https://nodejs.org/api/events.html#events_class_events_eventemitter) class.


##### `composer.on('active', callback(mimeMessage))`

Emitted whenever the app should send an "active status" message to the remote peer. The given `callback` function is called with two arguments:

* `mimeMessage` ([mimemessage.Entity](https://github.com/eface2face/mimemessage.js/blob/master/docs/Entity.md)): Instance of `mimemessage.Entity` to be sent to the peer.

```javascript
composer.on('active', function (mimeMessage) {
    myChat.send(mimeMessage);
});
```


##### `composer.on('idle', callback(mimeMessage))`

Emitted whenever the app should send an "idle status" message to the remote peer. The given `callback` function is called with two arguments:

* `mimeMessage` ([mimemessage.Entity](https://github.com/eface2face/mimemessage.js/blob/master/docs/Entity.md)): Instance of `mimemessage.Entity` to be sent to the peer.

```javascript
composer.on('idle', function (mimeMessage) {
    myChat.send(mimeMessage);
});
```


### `iscomposing.Receiver` Class API

A `Receiver` instance manages the composing status of the remote peer.

```javascript
var receiver = new iscomposing.Receiver(options)
```

`options` is an optional object with the following fields:

* `format` (String): Whether to expect XML payload for "status" messages (as the [RFC 3994](http://tools.ietf.org/html/rfc3994) defines) or custom JSON payloads. Valid values are "xml" (default value) and "json".

```javascript
var receiver = new iscomposing.Receiver({
    format: 'json'
});
```


#### Methods


##### `receiver.received()`

Tell the receiver that a message (other than a "status" message) has been received.

```javascript
// When a chat message (msg) is received from the remote peer.
myChat.on('message', function (mimeMessage) {
    if (mimeMessage.contentType().type === 'text') {
        receiver.received();
    }
});
```

The app should call this method for each chat/audio/video message received from the remote peer (other than "status" message).


##### `receiver.process(statusMessage)`

Tell the receiver that a "status" message has been received. The receiver will process the given raw status message and fire the corresponding event (if needed).

 * `statusMessage` (String or [mimemessage.Entity](https://github.com/eface2face/mimemessage.js/blob/master/docs/Entity.md)): The received [RFC 3994](https://tools.ietf.org/html/rfc3994) status raw message or a `mimemessage.Entity` instance holding it.
 
```javascript
// When a message (msg) is received from the remote peer.
myChat.on('message', function (mimeMessage) {
    if (mimeMessage.contentType().fulltype === 'application/im-iscomposing+xml') {
        indicator.process(mimeMessage);
    }
});
```

The app should call this method for each "status" message received from the remote peer.


##### `receiver.close()`

Closes the receiver by emitting an "idle" event (if the current remote status was "idle").

```javascript
// When the chat window is closed.
receiver.close();
```

The app should call this method when, for example, the chat window is closed or the chat itself ends.


#### Events


##### `receiver.on('active', callback(statusContentType))`

Emitted when the remote peer is composing a message. The given `callback` function is called with a single argument:

* `statusContentType` (String): The type of message being composed ("text", "audio", "video", etc).

```javascript
receiver.on('active', function (statusContentType) {
    showRemoteIsComposing(statusContentType);
});
```


##### `receiver.on('idle', callback(statusContentType))`

Emitted when the remote peer is in idle state (rather than composing a new message). The given `callback` function is called with a single argument:

* `statusContentType` (String): The type of message that was previously being composed ("text", "audio", "video", etc).

```javascript
receiver.on('idle', function (statusContentType) {
    hideRemoteIsComposing();
});
```


### Debugging

The library includes the Node [debug](https://github.com/visionmedia/debug) module. In order to enable debugging:

In Node set the `DEBUG=iscomposing*` environment variable before running the application, or set it at the top of the script:

```javascript
process.env.DEBUG = 'iscomposing*';
```

In the browser run `iscomposing.debug.enable('iscomposing*');` and reload the page. Note that the debugging settings are stored into the browser LocalStorage. To disable it run `iscomposing.debug.disable('iscomposing*');`.


## Author

Iñaki Baz Castillo at [eFace2Face, inc.](https://eface2face.com)


## License

[MIT](./LICENSE) :)
