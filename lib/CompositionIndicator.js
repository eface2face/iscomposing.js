/**
 * Expose the CompositionIndicator class.
 */
module.exports = CompositionIndicator;


var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('iscomposing:CompositionIndicator'),
	debugerror = require('debug')('iscomposing:ERROR:CompositionIndicator'),
	EventEmitter = require('events').EventEmitter,
	Composer = require('./Composer'),
	Receiver = require('./Receiver');

debugerror.log = console.warn.bind(console);


function CompositionIndicator(options) {
	debug('new() | [options:%o]', options);

	var self = this;

	// Inherit from EventEmitter.
	EventEmitter.call(this);

	options = options || {};

	// Validate some options.
	if (options.format && ['xml', 'json'].indexOf(options.format) === -1) {
		throw new Error('options.format must be "xml" or "json"');
	}

	// Composer instance.
	this._composer = new Composer(
		// options
		options,
		// activeCb
		function (msg, mimeContentType) {
			emit.call(self, 'local:active', msg, mimeContentType);
		},
		// idleCb
		function (msg, mimeContentType) {
			emit.call(self, 'local:idle', msg, mimeContentType);
		}
	);

	// Receiver instance.
	this._receiver = new Receiver(
		// options
		options,
		// activeCb
		function (statusContentType) {
			emit.call(self, 'remote:active', statusContentType);
		},
		// idleCb
		function (statusContentType) {
			emit.call(self, 'remote:idle', statusContentType);
		}
	);
}


// Inherit from EventEmitter.
CompositionIndicator.prototype = Object.create(EventEmitter.prototype, {
	constructor: {
		value: CompositionIndicator,
		enumerable: false,
		writable: true,
		configurable: true
	}
});


/**
 * Tell the library that a message is being composed.
 * @param  {String} statusContentType  "text", "video", "audio", etc.
 */
CompositionIndicator.prototype.composing = function (statusContentType) {
	debug('composing() [statusContentType:"%s"]', statusContentType);

	this._composer.composing(statusContentType);
};


/**
 * Tell the library that the composed message was sent.
 */
CompositionIndicator.prototype.sent = function () {
	debug('sent()');

	this._composer.sent();
};


/**
 * Tell the library that the chat lost focus.
 */
CompositionIndicator.prototype.idle = function () {
	debug('idle()');

	this._composer.idle();
};


/**
 * Tell the library that a message has been received.
 * @param  {String} msg             Raw message body.
 * @param  {String} mimeContentType Content-Type of the message.
 * @return {Boolean}                True means that the message is a "status" message to
 *                                  be handled by this library. False otherwise.
 */
CompositionIndicator.prototype.received = function (msg, mimeContentType) {
	debug('received() [mimeContentType:"%s"]', mimeContentType);

	return this._receiver.received(msg, mimeContentType);
};


/**
 * Tell the library that the chat is closed.
 * No more events will be fired unless the app reactivates it by calling
 * API methods again.
 */
CompositionIndicator.prototype.close = function () {
	debug('close()');

	this._composer.close();
	this._receiver.close();
};


/**
 * Private API.
 */


function emit() {
	if (arguments.length === 1) {
		debug('emit "%s"', arguments[0]);
	} else {
		debug('emit "%s" [arg:%o]', arguments[0], arguments[1]);
	}

	try {
		this.emit.apply(this, arguments);
	}
	catch (error) {
		debugerror('emit() | error running an event handler for "%s" event: %o', arguments[0], error);
	}
}
