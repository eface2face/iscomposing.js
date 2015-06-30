/**
 * Expose the Composer class.
 */
module.exports = Composer;


var
	/**
	 * Dependencies.
	 */
	debug = require('debug')('iscomposing:Composer'),

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


function Composer(options, activeCb, idleCb) {
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
		this._format, this._refreshInterval, this._idleTimeout);

	// Callbacks.
	this._activeCb = activeCb;
	this._idleCb = idleCb;

	// Status.
	this._status = IDLE;

	// Current "status" content type.
	this._statusContentType = undefined;

	// Timers.
	this._activePeriodicTimer = undefined;
	this._idleTimer = undefined;
}


Composer.prototype.composing = function (statusContentType) {
	if (statusContentType && typeof statusContentType === 'string') {
		this._statusContentType = statusContentType.toLowerCase().trim();
	} else {
		this._statusContentType = DEFAULT_STATUS_CONTENT_TYPE;
	}

	setStatus.call(this, ACTIVE);
};


Composer.prototype.sent = function () {
	setStatus.call(this, IDLE, true);
};


Composer.prototype.blur = function () {
	setStatus.call(this, IDLE);
};


Composer.prototype.close = function () {
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
			this._activeCb(createActiveXML.call(this), MIME_CONTENT_TYPE_XML);
			break;
		case FORMAT_JSON:
			this._activeCb(createActiveJSON.call(this), MIME_CONTENT_TYPE_JSON);
			break;
	}
}


function callIdleCb() {
	switch (this._format) {
		case FORMAT_XML:
			this._idleCb(createIdleXML.call(this), MIME_CONTENT_TYPE_XML);
			break;
		case FORMAT_JSON:
			this._idleCb(createIdleJSON.call(this), MIME_CONTENT_TYPE_JSON);
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
		'</isComposing>\n';

	return xml;
}


function createIdleXML() {
	var xml =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<isComposing xmlns="urn:ietf:params:xml:ns:im-iscomposing">\n' +
		'  <state>idle</state>\n' +
		'  <contenttype>' + this._statusContentType + '</contenttype>\n' +
		'</isComposing>\n';

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
