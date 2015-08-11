/**
 * Expose the Composer class.
 */
module.exports = Composer;


var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('iscomposing:Composer'),
	debugerror = require('debug')('iscomposing:ERROR:Composer'),
	mimemessage = require('mimemessage'),
	EventEmitter = require('events').EventEmitter,

	/**
	 * Constants.
	 */
	FORMAT_XML = 0,
	FORMAT_JSON = 1,
	IDLE = 0,
	ACTIVE = 1,
	DEFAULT_REFRESH_INTERVAL = 120,
	DEFAULT_IDLE_TIMEOUT = 15,
	MIN_REFRESH_INTERVAL = 30,
	MIN_IDLE_TIMEOUT = 5,
	DEFAULT_STATUS_CONTENT_TYPE = 'text',
	MIME_CONTENT_TYPE_XML = 'application/im-iscomposing+xml',
	MIME_CONTENT_TYPE_JSON = 'application/im-iscomposing+json';

debugerror.log = console.warn.bind(console);


function Composer(options) {
	if (!(this instanceof Composer)) {
		return new Composer(options);
	}

	// Inherit from EventEmitter.
	EventEmitter.call(this);

	options = options || {};

	// Validate some options.
	if (options.format && ['xml', 'json'].indexOf(options.format) === -1) {
		throw new Error('options.format must be "xml" or "json"');
	}

	// Timer values.
	switch (options.refreshInterval) {
		case undefined:
			this._refreshInterval = DEFAULT_REFRESH_INTERVAL;
			break;
		case 0:
			this._refreshInterval = null;
			break;
		default:
			if (options.refreshInterval > MIN_REFRESH_INTERVAL) {
				this._refreshInterval = options.refreshInterval;
			} else {
				this._refreshInterval = MIN_REFRESH_INTERVAL;
			}
	}
	switch (options.idleTimeout) {
		case undefined:
			this._idleTimeout = DEFAULT_IDLE_TIMEOUT;
			break;
		case 0:
			this._idleTimeout = null;
			break;
		default:
			if (options.idleTimeout > MIN_IDLE_TIMEOUT) {
				this._idleTimeout = options.idleTimeout;
			} else {
				this._idleTimeout = MIN_IDLE_TIMEOUT;
			}
	}

	this._format = (options.format === 'json') ? FORMAT_JSON : FORMAT_XML;

	debug('new() | processed options [format:%s, refreshInterval:%s, idleTimeout:%s]',
		(this._format === FORMAT_XML ? 'xml' : 'json'), this._refreshInterval, this._idleTimeout);

	// Status.
	this._status = IDLE;

	// Current "status" content type.
	this._statusContentType = undefined;

	// Timers.
	this._activePeriodicTimer = undefined;
	this._idleTimer = undefined;
}


// Inherit from EventEmitter.
Composer.prototype = Object.create(EventEmitter.prototype, {
	constructor: {
		value: Composer,
		enumerable: false,
		writable: true,
		configurable: true
	}
});


Composer.prototype.composing = function (statusContentType) {
	debug('composing() [statusContentType:"%s"]', statusContentType);

	if (statusContentType && typeof statusContentType === 'string') {
		this._statusContentType = statusContentType.toLowerCase().trim();
	} else {
		this._statusContentType = DEFAULT_STATUS_CONTENT_TYPE;
	}

	setStatus.call(this, ACTIVE);
};


Composer.prototype.sent = function () {
	debug('sent()');

	setStatus.call(this, IDLE, true);
};


Composer.prototype.idle = function () {
	debug('idle()');

	setStatus.call(this, IDLE);
};


Composer.prototype.close = function () {
	debug('close()');

	setStatus.call(this, IDLE, true);
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

					runActivePeriodicTimer.call(this);
					runIdleTimer.call(this);
					callActiveCb.call(this);
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

					stopActivePeriodicTimer.call(this);
					stopIdleTimer.call(this);
					if (!doNotNotifyIdle) {
						callIdleCb.call(this);
					}
					break;
				}

				// From ACTIVE to ACTIVE.
				case ACTIVE: {
					debug('setStatus() | from ACTIVE to ACTIVE');

					runIdleTimer.call(this);
					break;
				}
			}
			break;
	}
}


function runActivePeriodicTimer() {
	var self = this;

	if (!this._refreshInterval) {
		return;
	}

	clearInterval(this._activePeriodicTimer);

	this._activePeriodicTimer = setInterval(function () {
		runIdleTimer.call(self);
		callActiveCb.call(self);
	}, this._refreshInterval * 1000);
}


function stopActivePeriodicTimer() {
	clearInterval(this._activePeriodicTimer);
}


function runIdleTimer() {
	var self = this;

	clearTimeout(this._idleTimer);

	this._idleTimer = setTimeout(function () {
		setStatus.call(self, IDLE);
	}, this._idleTimeout * 1000);
}


function stopIdleTimer() {
	clearTimeout(this._idleTimer);
}


function callActiveCb() {
	switch (this._format) {
		case FORMAT_XML:
			emit.call(this, 'active', mimemessage.factory({
				contentType: MIME_CONTENT_TYPE_XML,
				body: createActiveXML.call(this)
			}));
			break;
		case FORMAT_JSON:
			emit.call(this, 'active', mimemessage.factory({
				contentType: MIME_CONTENT_TYPE_JSON,
				body: createActiveJSON.call(this)
			}));
			break;
	}
}


function callIdleCb() {
	switch (this._format) {
		case FORMAT_XML:
			emit.call(this, 'idle', mimemessage.factory({
				contentType: MIME_CONTENT_TYPE_XML,
				body: createIdleXML.call(this)
			}));
			break;
		case FORMAT_JSON:
			emit.call(this, 'idle', mimemessage.factory({
				contentType: MIME_CONTENT_TYPE_JSON,
				body: createIdleJSON.call(this)
			}));
			break;
	}
}


function createActiveXML() {
	var xml =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<isComposing xmlns="urn:ietf:params:xml:ns:im-iscomposing">\n' +
		'  <state>active</state>\n' +
		'  <contenttype>' + this._statusContentType + '</contenttype>\n';
	if (this._refreshInterval) {
		xml +=
		'  <refresh>' + this._refreshInterval + '</refresh>\n';
	}
	xml +=
		'</isComposing>';

	return xml;
}


function createIdleXML() {
	var xml =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<isComposing xmlns="urn:ietf:params:xml:ns:im-iscomposing">\n' +
		'  <state>idle</state>\n' +
		'  <contenttype>' + this._statusContentType + '</contenttype>\n' +
		'</isComposing>';

	return xml;
}


function createActiveJSON() {
	var object = {
		state: 'active',
		contentType: this._statusContentType
	};

	if (this._refreshInterval) {
		object.refresh = this._refreshInterval;
	}

	return JSON.stringify(object, null, '\t');
}


function createIdleJSON() {
	var object = {
		state: 'idle',
		contentType: this._statusContentType
	};

	return JSON.stringify(object, null, '\t');
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

