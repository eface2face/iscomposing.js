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
	REGEXP_MIME_CONTENT_TYPE_XML = /^[ ]*application\/im-iscomposing\+xml/i,
	REGEXP_MIME_CONTENT_TYPE_JSON = /^[ ]*application\/im-iscomposing\+json/i,
	REGEXP_XML_STATE = /<([^: ]+:)?state([ ]+[^>]*)?>[\r\n ]*([a-zA-Z0-9]+)[\r\n ]*<\/state>/im,
	REGEXP_XML_REFRESH = /<([^: ]+:)?refresh([ ]+[^>]*)?>[\r\n ]*([0-9]+)[\r\n ]*<\/refresh>/im,
	REGEXP_XML_CONTENT_TYPE = /<([^: ]+:)?contenttype([ ]+[^>]*)?>[\r\n ]*(.+)[\r\n ]*<\/contenttype>/im;

debugerror.log = console.warn.bind(console);


function Receiver(options, activeCb, idleCb) {
	this._format = (options.format === 'json') ? FORMAT_JSON : FORMAT_XML;

	debug('new() | processed options [format:%s]', this._format);

	// Callbacks.
	this._activeCb = activeCb;
	this._idleCb = idleCb;

	// Status.
	this._status = IDLE;

	// Current "status" content type.
	this._statusContentType = undefined;

	// Timer value.
	this._refreshTimeout = undefined;

	// Timer.
	this._activeTimer = undefined;
}


Receiver.prototype.received = function (msg, mimeContentType) {
	if (!msg || !mimeContentType || typeof msg !== 'string' || typeof mimeContentType !== 'string') {
		return false;
	}

	switch (this._format) {
		case FORMAT_XML: {
			// No a "status" message, so set IDLE state.
			if (!REGEXP_MIME_CONTENT_TYPE_XML.test(mimeContentType)) {
				setStatus.call(this, IDLE);
				return false;
			} else {
				handleStatusXML.call(this, msg);
				return true;
			}
			break;
		}

		case FORMAT_JSON: {
			// No a "status" message, so set IDLE state.
			if (!REGEXP_MIME_CONTENT_TYPE_JSON.test(mimeContentType)) {
				setStatus.call(this, IDLE);
				return false;
			} else {
				handleStatusJSON.call(this, msg);
				return true;
			}
			break;
		}

		// Should not happen.
		default:
			return true;
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

		handleStatus.call(this, {
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
			debugerror('receive() | invalid JSON message: %s', error.toString());
			return;
		}

		handleStatus.call(this, object);
	}

	function handleStatus(data) {
		// Validate.
		if (['active', 'idle'].indexOf(data.state.toLowerCase()) === -1) {
			debugerror('receive() | "state" must be "active" or "idle", ignoring status message');

			return;
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
	}
};


Receiver.prototype.close = function () {
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

					stopActiveTimer.call(this);
					if (!doNotNotifyIdle) {
						callIdleCb.call(this);
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


function callActiveCb() {
	this._activeCb(this._statusContentType);
}


function callIdleCb() {
	this._idleCb(this._statusContentType);
}
