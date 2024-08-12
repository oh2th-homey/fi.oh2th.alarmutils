'use strict';

const { Driver } = require('homey');
// Cron Parser from https://github.com/harrisiirak/cron-parser
const cronParser = require('cron-parser');

module.exports = class mainDriver extends Driver {
 /**
	 * onInit is called when the driver is initialized.
	 */
	async onInit() {
		this.log('onInit - Driver initialized');
	}

	async onPair(session) {
		this.log('onPair - new session.');

		// Received when a view has changed
		session.setHandler('showView', async (viewId) => {
			this.log(`View: ${viewId}`);
		});

		// Received event for testCronTime
		session.setHandler('testCronTime', async (cronTime) => {
			this.log(`testCronTime: ${cronTime}`);
			// Test cronTime with cron-parser if valid or not
			try {
				cronParser.parseExpression(cronTime);
				this.log(`onPair - testCronTime - pass: ${cronTime}`);
				return { success: true };
			} catch (err) {
				this.error(`onPair - testCronTime - error: ${err.message}`);
				return { success: false, error: err.message };
			}
		});
	}
};
