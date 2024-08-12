'use strict';

const { Device } = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob } = require('cron');
// Cron Parser from https://github.com/harrisiirak/cron-parser
const cronParser = require('cron-parser');

const { strToMins, minsToStr, checkCapabilities } = require('../lib/helpers');

module.exports = class mainDevice extends Device {

	async onInit() {
		this.log(`${this.getName()} - onInit`);

		this.setCronTimePattern(this);
		checkCapabilities(this);
		await this.initCapabilityListeners();

		const settings = this.getSettings();
		const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(settings);
		this.initCronJob(cronTime, timeZone, runOnce);

		this.log(`${this.getName()} - onInit - done`);
	}

	async onAdded() {
		this.error(`${this.getName()} - onAdded - not implemented.`);
	}

	async onSettings({ oldSettings, newSettings, changedKeys }) {
		this.log(`${this.getName()} - onSettings - changedKeys: ${changedKeys}`);
		this.error(`${this.getName()} - onSettings - not implemented!`);
	}

	async onRenamed(name) {
		this.error(`${this.getName()} - onRenamed - not implemented`);
	}

	async onDeleted() {
		this.log(`${this.getName()} - onDeleted`);
		if (typeof this.cronJob !== 'undefined') {
			this.log(`${this.getName()} - onDeleted - stopping cronjob`);
			this.cronJob.stop();
			this.cronJob = undefined;
		}
		this.log(`${this.getName()} - onDeleted - done`);
	}

	/**
	 * @description Test given cronTime pattern if it is valid or not using cron-parser
	 */
	testCronTimePattern(cronTime) {
		try {
			cronParser.parseExpression(cronTime);
			return true;
		} catch (error) {
			this.error(`${this.getName()} - testCronTimePattern - error: ${error}`);
			return false;
		}
	}
	/**
	 * @description Set the cronTime pattern, override this in the device driver
	 */
	setCronTimePattern() {
		this.log(`${this.getName()} - setCronTimePattern - not used in this driver!`);
	}

	/**
	 * @description Get the cronTime string from the settings, override this in the device driver
	 */
	getSettingsCronTime(settings) {
		this.error(`${this.getName()} - getSettingsCronTime - not implemented!`);
	}

	/**
	 * @description Initialize cronjob from saved settings
	 *
	 * @param {String} cronTime The cronTime string '0 0 12 * * 1-5' for example
	 * @param {String} timeZone Select the timezone for the cronjob
	 * @param {Boolean} runOnce If true, the cronjob will be disabled after the first run
	 */
	async initCronJob(cronTime, timeZone, runOnce) {
		this.log(`${this.getName()} - initCronjob - cronTime: ${cronTime}, timeZone: ${timeZone}, runOnce: ${runOnce}`);

		// create cronjob with cronTime and timeZone, do not start yet
		try {
			this.cronJob = new CronJob(
				cronTime, // cronTime
				function () {
					this.log(`${this.getName()} - cronJob - tick at ${new Date().toISOString()}`);
					this.cronJobRunTriggers(runOnce);
					this.updateScheduleCapabilityValues();
				}, // onTick
				false, //onComplete
				false, // start
				timeZone, // timeZone
			);
		} catch (error) {
			this.error(`${this.getName()} - initCronJob - Time = [${cronTime}], Timezone = [${timeZone}] error: ${error}`);
			return new Error(this.homey.__('message.init_cronjob_error'));
		}

		// add callback to cronjob to enable/disable cronjob on runOnce
		this.cronJob.addCallback(() => {
			this.log(`${this.getName()} - cronJob - callback`);
			if (runOnce) {
				this.schedulerDisable();
				this.log(`${this.getName()} - cronJob - runOnce - not running again`);
			}
		});

		// start cronjob if enabled
		if (this.getCapabilityValue('is_enabled')) {
			this.schedulerEnable();
		}
		return this.getNextScheduledTime();
	}

	/**
	 * @description Restart cronjob from saved settings and trigger device_schedule_updated
	 *
	 * @param {Object} settings settings object
	 */
	async restartCronJob(settings) {
		if (typeof this.cronJob !== 'undefined') {
			this.log(`${this.getName()} - restartCronJob - stopping cronjob`);
			this.cronJob.stop();
			this.cronJob = undefined;
		}

		const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(settings);
		const nextRun = await this.initCronJob(cronTime, timeZone, runOnce);
		const tz = this.homey.clock.getTimezone();

		const nextTime = new Date(nextRun).toLocaleString('en-US', {
			hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
		});

		const nextDate = new Date(nextRun);
		const yyyy = nextDate.toLocaleString('en-US', { year: 'numeric', timeZone: tz });
		const mm = nextDate.toLocaleString('en-US', { month: '2-digit', timeZone: tz });
		const dd = nextDate.toLocaleString('en-US', { day: '2-digit', timeZone: tz });
		const nextDateFormatted = `${yyyy}-${mm}-${dd}`;

		this.homey.flow.getDeviceTriggerCard('device_schedule_updated')
			.trigger(this, {
				name: this.getName(),
				enabled: this.getCapabilityValue('is_enabled'),
				date: nextDateFormatted,
				time: nextTime,
				next: String(nextRun),
			})
			.catch(this.error)
			.then(this.log(`${this.getName()} - restartCronJob - device_schedule_updated at ${String(nextRun)}`));
	}

	/**
	 * @description Enable cronjob
	 */
	async schedulerEnable() {
		this.log(`${this.getName()} - schedulerEnable`);
		try {
			this.cronJob.start();
			await this.setCapabilityValue('is_enabled', true);
		} catch (error) {
			await this.setCapabilityValue('is_enabled', false);
			this.error(`${this.getName()} - schedulerEnable - error: ${error}`);
		}
		this.updateScheduleCapabilityValues();
	}

	/**
	 * @description Disable cronjob
	 */
	async schedulerDisable() {
		if (typeof this.cronJob !== 'undefined') {
			this.log(`${this.getName()} - schedulerDisable`);
			this.cronJob.stop();
		}
		await this.setCapabilityValue('is_enabled', false);
		this.updateScheduleCapabilityValues();
	}

	/**
	 * @description get next scheduled time
	 * @returns {String} next scheduled time
	 */
	getNextScheduledTime() {
		if (!this.getCapabilityValue('is_enabled')) return null;
		try {
			return String(this.cronJob.nextDate());
		} catch (error) {
			this.error(`${this.getName()} - getNextScheduledTime - error: ${error}`);
			return null;
		}
	}

	/**
	 * @description Update schedule capability values
	 */
	async updateScheduleCapabilityValues() {
		const nextRun = this.getNextScheduledTime();

		this.log(`${this.getName()} - updateScheduleCapabilityValues - nextRun: ${typeof nextRun} = ${nextRun}`);
		if (!nextRun) {
			this.setCapabilityValue('text_schedule_next', null);
			this.setCapabilityValue('text_schedule_time', null);
			this.setCapabilityValue('text_schedule_date', null);
		} else {
			const nextTime = new Date(nextRun).toLocaleString('en-US', {
				hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.homey.clock.getTimezone(),
			});

			const yyyy = new Date(nextRun).toLocaleString('en-US', { year: 'numeric', timeZone: this.homey.clock.getTimezone() });
			const mm = new Date(nextRun).toLocaleString('en-US', { month: '2-digit', timeZone: this.homey.clock.getTimezone() });
			const dd = new Date(nextRun).toLocaleString('en-US', { day: '2-digit', timeZone: this.homey.clock.getTimezone() });
			const nextDateFormatted = `${yyyy}-${mm}-${dd}`;

			this.setCapabilityValue('text_schedule_next', String(nextRun));
			this.setCapabilityValue('text_schedule_time', String(nextTime));
			this.setCapabilityValue('text_schedule_date', nextDateFormatted);
		}
	}

	/**
	 * @description Trigger flow cards for cronjob
	 */
	async cronJobRunTriggers(runOnce = false) {
		this.log(`${this.getName()} - cronJobRunTriggers`);

		const now = new Date();
		const tz = this.homey.clock.getTimezone();

		const timeNow = now.toLocaleString('en-US', {
			hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
		});

		const yyyy = now.toLocaleString('en-US', { year: 'numeric', timeZone: tz });
		const mm = now.toLocaleString('en-US', { month: '2-digit', timeZone: tz });
		const dd = now.toLocaleString('en-US', { day: '2-digit', timeZone: tz });
		const dateNow = `${yyyy}-${mm}-${dd}`;

		let timeNext = this.getNextScheduledTime();
		if (runOnce) timeNext = String(null);
		this.homey.flow.getDeviceTriggerCard('device_schedule_triggered')
			.trigger(this, {
				name: this.getName(),
				date: dateNow,
				time: timeNow,
				next: timeNext,
			})
			.catch(this.error)
			.then(this.log(`${this.getName()} - cronJobRunTriggers - device_schedule_triggered at ${timeNow} next at ${timeNext}`));

		this.log(`${this.getName()} - cronJobRunTriggers - done`);
	}

	/**
	 * Handle capability listeners
	 */
	async initCapabilityListeners() {
		this.log(`${this.getName()} - initCapabilityListeners`);
		this.registerCapabilityListener('is_enabled', this.onCapability_IS_ENABLED.bind(this));
	}

	/**
	 * Handle listeners
	 */
	async onCapability_IS_ENABLED(enabled) {
		this.log(`${this.getName()} - onCapability_IS_ENABLED '${enabled}'`);
		if (enabled) this.schedulerEnable();
		else this.schedulerDisable();
		this.log(`${this.getName()} - onCapability_IS_ENABLED - done`);
	}

	async onAction_DEVICE_SCHEDULE_TIME(time) {
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_TIME '${time}'`);

		if (!this.cronTimePattern.test(time)) {
			this.error(`${this.getName()} - onAction_DEVICE_SCHEDULE_TIME - Invalid time string format: ${time}`);
			return Promise.reject(new Error(this.homey.__('settings.error.time_invalid')));
		}

		await this.setSettings({
			time,
		});
		this.restartCronJob(this.getSettings());
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_TIME - done`);
	}

	async onAction_DEVICE_SCHEDULE_CRONTIME(crontime) {
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_CRONTIME '${crontime}'`);

		if (!this.cronTimePattern.test(crontime)) {
			this.error(`${this.getName()} - onAction_DEVICE_SCHEDULE_CRONTIME - Invalid time string format: ${crontime}`);
			return Promise.reject(new Error(this.homey.__('settings.error.crontime_invalid')));
		}

		await this.setSettings({
			time: crontime,
		});
		this.restartCronJob(this.getSettings());
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_CRONTIME - done`);
	}

	async onAction_DEVICE_SCHEDULE_AHEAD_TIME(args) {
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_AHEAD_TIME '${args.minutes}' mins before '${args.time}'`);

		const time = strToMins(args.time) - args.minutes;
		let newSettings = {
			time: minsToStr(time),
			repeat_monday: args.monday,
			repeat_tuesday: args.tuesday,
			repeat_wednesday: args.wednesday,
			repeat_thursday: args.thursday,
			repeat_friday: args.friday,
			repeat_saturday: args.saturday,
			repeat_sunday: args.sunday,
		};

		// Shift to previous day if time is negative
		if (time < 0) {
			newSettings = {
				time: minsToStr(time + 1440),
				repeat_monday: args.tuesday,
				repeat_tuesday: args.wednesday,
				repeat_wednesday: args.thursday,
				repeat_thursday: args.friday,
				repeat_friday: args.saturday,
				repeat_saturday: args.sunday,
				repeat_sunday: args.monday,
			};
		}
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_AHEAD_TIME - newSettings: ${JSON.stringify(newSettings)}`);
		await this.setSettings(newSettings);
		this.restartCronJob(this.getSettings());
		this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_AHEAD_TIME - done`);
	}

};
