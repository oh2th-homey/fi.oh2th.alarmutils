'use strict';

const { Driver } = require('homey');

module.exports = class mainDriver extends Driver {

	/**
	 * onInit is called when the driver is initialized.
	 */
	async onInit() {
		this.log('Scheduler has been initialized');
	}

	async onPair(session) {
		this.log('onPair new session...');
	}

};
