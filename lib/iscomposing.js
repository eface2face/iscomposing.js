var
	/**
	 * Dependencies.
	 */
	CompositionIndicator = require('./CompositionIndicator');


/**
 * Expose a function that returns an instance of CompositionIndicator.
 */
module.exports = function (data) {
	return new CompositionIndicator(data);
};

