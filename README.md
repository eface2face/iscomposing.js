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


### iscomposing API


#### `var indicator = iscomposing(options)`

The top-level module exported by the library is a function that returns an instance of the `CompositionIndicator` class described below.

`options` is an optional object with the following fields:

* `format` (String): Whether to use XML payload for "status" messages (as the [RFC 3994](http://tools.ietf.org/html/rfc3994) defines) or custom JSON payloads. Valid values are "xml" (default value) and "json".
* `refreshInterval` (Number): Interval for sending "active" messages (in seconds). Default value is 120. Minimum value is 30.
* `idleTimeout` (Number): Timeout for sending "idle" message if the apps stops composing its message (in seconds). Default value is 15. Minimum value is 5.

```javascript
var indicator = iscomposing({
    format: 'json',
    refreshInterval: 60
});
```


### CompositionIndicator Class API


#### Methods

##### `indicator.composing(statusContentType)`

Tell the library that a message is being composed.

 * `statusContentType` (String): Optional string indicating the type of message being composed. Default value is "text".

```javascript
// When the user types into the chat text input:
indicator.composing();
```

The app should call this method whenever the user types into the text input of the chat.


##### `indicator.sent()`

Tell the library that the composed message was sent.

```javascript
// When the user uses clicks on "Send" button:
myChat.send({
    contentType: 'text/plain',
    body: text
});
indicator.sent();
```

The app should call this method whenever a message (other than a "status" message) is sent to the remote peer.


##### `indicator.idle()`

Tell the library that the user is no longer typing or composing a message.

```javascript
// When the chat text input looses the focus:
indicator.idle();
```

The app should call this method whenever the user was writting into the chat text input and clicked elsewhere before sending the ongoing text, or also when he suddenly deletes all the text previously written in the chat input.


##### `indicator.received()`

Tell the library that a message (other than a "status" message) has been received.

```javascript
// When a chat message (msg) is received from the remote peer.
myChat.on('message', function (message) {
    if (message.contentType === 'text/plain') {
        indicator.received();
    }
});
```

The app should call this method for each chat/audio/video message received from the remote peer (other than "status" message).


##### `indicator.process(msg)`

Tell the library that a "status" message has been received. The library will process the given raw message.

 * `msg` (String): The received raw message.
 
```javascript
// When a message (msg) is received from the remote peer.
myChat.on('message', function (message) {
    if (message.contentType === 'application/im-iscomposing+xml') {
        indicator.process(message.body);
    }
});
```

The app should call this method for each "status" message received from the remote peer.


##### `indicator.close()`

Tell the library that the chat is closed. No more events will be fired unless the app reactivates it by calling any API method again.

```javascript
// When the chat window is closed.
indicator.close();
```

The app should call this method when, for example, the chat window is closed or the chat itseld ends.


#### Events

The `CompositionIndicator` class inherits from the Node [EventEmitter](https://nodejs.org/api/events.html#events_class_events_eventemitter) class.


##### `indicator.on('local:active', callback(msg, mimeContentType))`

Emitted whenever the app should send an "active status" message to the remote peer. The given `callback` function is called with two arguments:

* `msg` (String): The raw message body to be sent.
* `mimeContentType` (String): The corresponding value for the MIME *Content-Type* header.

```javascript
indicator.on('local:active', function (msg, mimeContentType) {
    myChat.send({
        body: msg,
        contentType: mimeContentType
    });
});
```


##### `indicator.on('local:idle', callback(msg, mimeContentType))`

Emitted whenever the app should send an "idle status" message to the remote peer. The given `callback` function is called with two arguments:

* `msg` (String): The raw message body to be sent.
* `mimeContentType` (String): The corresponding value for the MIME *Content-Type* header.

```javascript
indicator.on('local:idle', function (msg, mimeContentType) {
    myChat.send({
        body: msg,
        contentType: mimeContentType
    });
});
```


##### `indicator.on('remote:active', callback(statusContentType))`

Emitted when the remote peer is composing a message. The given `callback` function is called with a single argument:

* `statusContentType` (String): The type of message being composed ("text", "audio", "video", etc).

```javascript
indicator.on('remote:active', function (statusContentType) {
    showRemoteIsComposing(statusContentType);
});
```


##### `indicator.on('remote:idle', callback(statusContentType))`

Emitted when the remote peer is in idle state (rather than composing a new message). The given `callback` function is called with a single argument:

* `statusContentType` (String): The type of message that was previously being composed ("text", "audio", "video", etc).

```javascript
indicator.on('remote:idle', function (statusContentType) {
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
