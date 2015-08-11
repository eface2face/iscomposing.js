/**
 * Expose the Receiver class.
 */
module.exports = Receiver;


var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('iscomposing:Receiver'),
	debugerror = require('debug')('iscomposing:ERROR:Receiver'),
	mimemessage = require('mimemessage'),
	EventEmitter = require('events').EventEmitter,

	/**
	 * Constants.
	 */
	FORMAT_XML = 0,
	FORMAT_JSON = 1,
	IDLE = 0,
	ACTIVE = 1,
	DEFAULT_REFRESH_TIMEOUT = 120,
	DEFAULT_REFRESH_TIMEOUT = 12,
	MIN_REFRESH_TIMEOUT = 30,
	DEFAULT_STATUS_CONTENT_TYPE = 'text',
	REGEXP_XML_STATE = /<([^: ]+:)?state([ ]+[^>]*)?>[\r\n ]*([a-zA-Z0-9]+)[\r\n ]*<\/state>/im,
	REGEXP_XML_REFRESH = /<([^: ]+:)?refresh([ ]+[^>]*)?>[\r\n ]*([0-9]+)[\r\n ]*<\/refresh>/im,
	REGEXP_XML_CONTENT_TYPE = /<([^: ]+:)?contenttype([ ]+[^>]*)?>[\r\n ]*(.+)[\r\n ]*<\/contenttype>/im;

debugerror.log = console.warn.bind(console);


function Receiver(options) {
	if (!(this instanceof Receiver)) {
		return new Receiver(options);
	}

	// Inherit from EventEmitter.
	EventEmitter.call(this);

	options = options || {};

	// Validate some options.
	if (options.format && ['xml', 'json'].indexOf(options.format) === -1) {
		throw new Error('options.format must be "xml" or "json"');
	}

	this._format = (options.format === 'json') ? FORMAT_JSON : FORMAT_XML;

	debug('new() | processed options [format:%s]',
		(this._format === FORMAT_XML ? 'xml' : 'json'));

	// Status.
	this._status = IDLE;

	// Current "status" content type.
	this._statusContentType = undefined;

	// Timer value.
	this._refreshTimeout = undefined;

	// Timer.
	this._activeTimer = undefined;
}


// Inherit from EventEmitter.
Receiver.prototype = Object.create(EventEmitter.prototype, {
	constructor: {
		value: Receiver,
		enumerable: false,
		writable: true,
		configurable: true
	}
});


Receiver.prototype.received = function () {
	debug('received()');

	setStatus.call(this, IDLE);
};


Receiver.prototype.process = function (msg) {
	debug('process()');

	if (msg instanceof mimemessage.Entity) {
		msg = msg.body;
	}

	if (!msg || typeof msg !== 'string') {
		debugerror('process() | wrong status message: %s', msg);
		return false;
	}

	switch (this._format) {
		case FORMAT_XML:
			handleStatusXML.call(this, msg);
			break;
		case FORMAT_JSON: {
			handleStatusJSON.call(this, msg);
			break;
		}
	}

	function handleStatusXML(msg) {
		var
			match,
			state, refresh, contentType;

		// Get 'state'.
		match = msg.match(REGEXP_XML_STATE);
		if (match) {
			state = match[3];
		}

		// Get 'refresh'.
		match = msg.match(REGEXP_XML_REFRESH);
		if (match) {
			refresh = parseInt(match[3]);
		}

		// Get 'contenttype'.
		match = msg.match(REGEXP_XML_CONTENT_TYPE);
		if (match) {
			contentType = match[3];
		}

		return handleStatus.call(this, {
			state: state,
			refresh: refresh,
			contentType: contentType
		});
	}

	function handleStatusJSON(msg) {
		var object;

		try {
			object = JSON.parse(msg);
		} catch (error) {
			debugerror('process() | invalid JSON message: %s', error.toString());
			return false;
		}

		return handleStatus.call(this, object);
	}

	function handleStatus(data) {
		// Validate.
		if (['active', 'idle'].indexOf(data.state.toLowerCase()) === -1) {
			debugerror('process() | "state" must be "active" or "idle", ignoring status message');

			return false;
		}

		if (data.contentType && typeof data.contentType === 'string') {
			this._statusContentType = data.contentType.toLowerCase().trim();
		} else {
			this._statusContentType = DEFAULT_STATUS_CONTENT_TYPE;
		}

		switch (data.refresh) {
			case undefined:
			case null:
			case NaN:
			case false:
				this._refreshTimeout = DEFAULT_REFRESH_TIMEOUT;
				break;
			default:
				if (data.refresh > MIN_REFRESH_TIMEOUT) {
					this._refreshTimeout = data.refresh;
				} else {
					this._refreshTimeout = MIN_REFRESH_TIMEOUT;
				}
		}

		switch (data.state) {
			case 'active':
				setStatus.call(this, ACTIVE);
				break;

			case 'idle':
				setStatus.call(this, IDLE);
				break;
		}

		return true;
	}
};


Receiver.prototype.close = function () {
	debug('close()');

	setStatus.call(this, IDLE);
};


/**
 * Private API.
 */


function setStatus(newStatus, doNotNotifyIdle) {
	var oldStatus = this._status;

	this._status = newStatus;

	switch (oldStatus) {
		case IDLE:
			switch (newStatus) {
				// From IDLE to ACTIVE.
				case ACTIVE: {
					debug('setStatus() | from IDLE to ACTIVE');

					runActiveTimer.call(this);
					emit.call(this, 'active', this._statusContentType);
					break;
				}

				// From IDLE to IDLE (ignore).
				case IDLE: {
					debug('setStatus() | from IDLE to IDLE');

					break;
				}
			}
			break;

		case ACTIVE:
			switch (newStatus) {
				// From ACTIVE to IDLE.
				case IDLE: {
					debug('setStatus() | from ACTIVE to IDLE');

					stopActiveTimer.call(this);
					if (!doNotNotifyIdle) {
						emit.call(this, 'idle', this._statusContentType);
					}
					break;
				}

				// From ACTIVE to ACTIVE.
				case ACTIVE: {
					debug('setStatus() | from ACTIVE to ACTIVE');

					runActiveTimer.call(this);
					break;
				}
			}
			break;
	}
}


function runActiveTimer() {
	var self = this;

	clearTimeout(this._activeTimer);

	this._activeTimer = setTimeout(function () {
		setStatus.call(self, IDLE);
	}, this._refreshTimeout * 1000);
}


function stopActiveTimer() {
	clearTimeout(this._activeTimer);
}


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

