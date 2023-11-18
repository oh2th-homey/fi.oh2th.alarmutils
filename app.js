'use strict';

const Homey = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob } = require('cron');
// Cron matcher from https://github.com/datasert/cronjs
const cronMatcher = require('@datasert/cronjs-matcher');
// App specific modules.
const flowActions = require('./lib/flows/actions');
const flowConditions = require('./lib/flows/conditions');
const flowTriggers = require('./lib/flows/triggers');

class AlarmUtils extends Homey.App {

	async onInit() {
		this.myAppIdVersion = `${this.homey.manifest.id}/${this.homey.manifest.version}`;
		this.log(`${this.myAppIdVersion} - onInit - starting...`);

		// Init device flow cards.
		await flowActions.init(this);
		await flowConditions.init(this);
		await flowTriggers.init(this);

		this.initAppCronJob();

		this.log(`${this.myAppIdVersion} - onInit - started.`);
	}

	async onUninit() {
		this.log(`${this.myAppIdVersion} - onUninit - stopping...`);
		this.cronJob.stop();
		this.cronJob = undefined;
		this.log(`${this.myAppIdVersion} - onUninit - stopped.`);
	}

	async initAppCronJob() {
		this.log(`${this.myAppIdVersion} - initAppCronjob`);

		// create cronjob with cronTime and timeZone, do not start yet
		this.appCronJob = new CronJob({
			cronTime: '0 * * * * *',
			onTick: () => {
				this.onAppInterval();
			},
			start: false,
			// timeZone: 'Europe/Amsterdam',
		});
		this.appCronJob.start();
	}

	async onAppInterval() {
		// this.log(`${this.myAppIdVersion} - onAppInterval`);

		// Get all configured scheduler devices.
		const schedulerDriver = this.homey.drivers.getDriver('scheduler');
		const schedulerDevices = schedulerDriver.getDevices();

		// Iterate over all active scheduler devices.
		schedulerDevices.forEach((schedulerDevice) => {
			if (schedulerDevice.getCapabilityValue('is_enabled') === true) {
				const dateTimeNow = new Date();

				const nextScheduledTime = schedulerDevice.getNextScheduledTime();
				const dateTimeNext = new Date(nextScheduledTime);

				const scheduledTime = dateTimeNext.toLocaleString('en-US', {
					hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.homey.clock.getTimezone(),
				});

				const state = { minutes: Math.abs(Math.floor((dateTimeNext - dateTimeNow) / 60000)) + 1 };

				const tokens = {
					name: schedulerDevice.getName(),
					time: scheduledTime,
					next: nextScheduledTime,
					minutesToNext: state.minutes,
				};

				// If next trigger is in the future trigger the device_schedule_trigger_in flow card.
				if (dateTimeNext > dateTimeNow) {
					this.homey.flow.getDeviceTriggerCard('device_schedule_trigger_in')
						.trigger(schedulerDevice, tokens, state)
						.catch(this.error);
				}
			}
		});
	}

}

module.exports = AlarmUtils;
