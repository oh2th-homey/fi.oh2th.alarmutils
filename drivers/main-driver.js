'use strict';

const { Driver } = require('homey');

module.exports = class mainDriver extends Driver {

	/**
	 * onInit is called when the driver is initialized.
	 */
	async onInit() {
		this.log('onInit - Driver initialized');
	}

	async onPair(session) {
		this.log('onPair - new session.');

		await session.showView('configure');

		// Received when a view has changed
		session.setHandler('showView', async (viewId) => {
			this.log(`View: ${viewId}`);
		});

	}

};
