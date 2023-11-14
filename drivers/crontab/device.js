'use strict';

const mainDevice = require('../main-device');
// CronTime from https://github.com/kelektiv/node-cron
const { CronTime } = require('cron');

module.exports = class CrontabDevice extends mainDevice {

	async onSettings({ oldSettings, newSettings, changedKeys }) {
		this.log(`${this.getName()} - onSettings - changedKeys: ${changedKeys}`);

		// Check input from newSettings for time string format
		if (changedKeys.includes('time')) {
			if (!this.cronTimePattern.test(newSettings.time)) {
				this.error(`${this.getName()} - onSettings - Invalid crontime string format: ${newSettings.time}`);
				return Promise.reject(new Error(this.homey.__('settings.error.crontime_invalid')));
			}
		}

		// Check input from newSettings for timezones
		if (changedKeys.includes('timezone')) {
			const dt = new Date();
			try {
				dt.toLocaleString('en-US', { timeZone: newSettings.timezone });
			} catch (error) {
				this.error(`${this.getName()} - onSettings - Invalid timezone: ${newSettings.timezone}`);
				return Promise.reject(new Error(this.homey.__('settings.error.timezone_invalid')));
			}
		}

		this.restartCronJob(newSettings);

		this.log(`${this.getName()} - onSettings - done`);
	}

	/**
	 * @description set the crontime pattern
	 */
	// For validating crontime string input from action cards and settings
	// Test against valid time string formats:
	// # cron
	// 0 0 0 1 1 * 1
	// 0 0 0 1 1 * 1,2
	// 0 0 0 1 1 * 1,2,3
	// 0 0 0 1 * * 1/4
	// 0 0 0 * * 0 1-4
	// 0 0 0 * * * 2/4
	// 0 0 * * * *
	//
	// # predefined
	// @annually
	// @yearly
	// @monthly
	// @weekly
	// @daily
	// @hourly
	// @reboot
	//
	// # every
	// @every 5s
	// @every 20h30m
	//
	// If this is updated, also update the regex in the pair/configure.html file
	setCronTimePattern() {
		// eslint-disable-next-line max-len, no-useless-escape
		this.cronTimePattern = new RegExp(/^((@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,6}))$/);
	}

	/**
	 * @description Get the cronTime string from the settings
	 *
	 * @param {Object} settings The settings object
	 * @returns {Object} cronTime, timeZone, runOnce
	 * @example
	 * const { cronTime, timeZone, runOnce } = await this.getSettingsCronTime();
	 * this.initCronJob(cronTime, timeZone, runOnce);
	 * // cronTime: '0 0 12 * * 1-5'
	 * // timeZone: 'Europe/Helsinki'
	 * // runOnce: false (or true)
	 */
	getSettingsCronTime(settings) {
		const cronTime = settings.time;
		const timeZone = settings.timezone;
		const runOnce = settings.runonce;

		try {
			// eslint-disable-next-line no-new
			new CronTime(cronTime, timeZone);
			this.log(`${this.getName()} - getSettingsCronTime - Time = [${cronTime}], Timezone = [${timeZone}]`);
			return { cronTime, timeZone, runOnce };
		} catch (error) {
			this.error(`${this.getName()} - getSettingsCronTime - Time = [${cronTime}], Timezone = [${timeZone}] error: ${error}`);
			return new Error(this.homey.__('settings.error.time_invalid'));
		}
	}

};
