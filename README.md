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


#### `indicator.composing(statusContentType)`

Tell the library that a message is being composed.

 * `statusContentType` (String): Optional string indicating the type of message being composed. Default value is "text".

```javascript
// When the user uses the chat text input:
indicator.composing();
```

The app should call this method whenever the user writes or deletes into the text input of the chat.


#### `indicator.sent()`

Tell the library that the composed message was sent.

```javascript
// When the user uses clicks on "Send" button:
myChat.send(message);
indicator.composing();
```

The app should call this method whenever a message is sent to the remote peer.


#### `indicator.blur()`

Tell the library that the chat lost focus.

```javascript
// When the chat text input looses the focus:
indicator.blur();
```

The app should call this method whenever the user was writting into the chat text input and clicked elsewhere before sending the ongoing text.


#### `indicator.received(msg, mimeContentType)`

Tell the library that a message has been received. The library will process the given raw message and return `true` if it was a "status" message (so the app is done). Otherwise it returns `false` so the app should continue processing the message as usual (it may be a real chat message or whatever).

 * `msg` (String): The received raw message.
 * `mimeContentType` (String): The MIME Content-Type of the received message (typically indicated in a *Content-Type* header.

For the library to handle the message, the value of the `mimeContentType` argument must be "application/im-iscomposing+xml" (if `format` is "xml) or "application/im-iscomposing+json" (if `format` is "json").

Returns `true` (the app should end message processing) or `false` (the app should handle the received message by its own).

```javascript
// When a message (msg) is received from the remote peer.
myChat.on('message', function (message) {
    if (indicator.received(message.body, message.contentType)) {
        // It was a "status" message already, so stop here.
        return;
    } else {
        // It was not a "status" message, so process it as usual.
        showReceivedMessage(message.body);
    }
});
```

The app should call this method for each message received from the remote peer.


#### `indicator.close()`

Tell the library that the chat is closed. No more events will be fired unless the app reactivates it by calling any API method again.

```javascript
// When the chat window is closed.
indicator.close();
```

The app should call this method when, for example, the chat window is closed.


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
