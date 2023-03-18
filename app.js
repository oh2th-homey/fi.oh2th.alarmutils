'use strict';

const Homey = require('homey');
const { HomeyAPIApp } = require('homey-api');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob } = require('cron');
const flowActions = require('./lib/flows/actions');
const flowConditions = require('./lib/flows/conditions');
const flowTriggers = require('./lib/flows/triggers');
const appFlowActions = require('./lib/app-flows/actions');
const appFlowActions2 = require('./lib/app-flows/actions-platform2');
const appFlowTriggers = require('./lib/app-flows/triggers');

class AlarmUtils extends Homey.App {

  async onInit() {
    this.myAppIdVersion = `${this.homey.manifest.id}/${this.homey.manifest.version}`;
    this.log(`${this.myAppIdVersion} - onInit - starting...`);

    // Init device flow cards.
    await flowActions.init(this);
    await flowConditions.init(this);
    await flowTriggers.init(this);

    // Init Homey Alarms API and related flow cards, if on pre-Homey Pro 2023 platform.
    if (this.homey.platform === 'local' && (this.homey.platformVersion === 1 || this.homey.platformVersion === undefined)) {
      this.log(`${this.myAppIdVersion} - onInit - local platform version 1 or undefined - Homey-API and related app flow cards.`);

      this.api = new HomeyAPIApp({
        homey: this.homey,
        debug: true,
      });

      await this.api.alarms.connect();
      this.alarms = await this.api.alarms.getAlarms();
      this.log(`${this.myAppIdVersion} - Found alarms: '${JSON.stringify(this.alarms, null, 2)}'`);

      await appFlowActions.init(this);
      await appFlowTriggers.init(this);
    } else {
      this.log(`${this.myAppIdVersion} - onInit - local platform version 2 or higher - Homey-API and related app flow cards not supported.`);
      // Init dummy flow cards for Homey Pro 2023 platform to inform user to move to use the Scheduler device instead.
      await appFlowActions2.init(this);
    }

    this.sendNotifications();
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

        // If next trigger in in the future trigger the device_schedule_trigger_in flow card.
        if (dateTimeNext > dateTimeNow) {
          this.homey.flow.getDeviceTriggerCard('device_schedule_trigger_in')
            .trigger(schedulerDevice, tokens, state)
            .catch(this.error);
        }
      }
    });
  }

  async sendNotifications() {
    const ntfy_deprecation_01 = '[Action Scheduler] (1/2) - Support for the Homey Alarms API will be removed in a future version of this app.';
    const ntfy_deprecation_02 = '[Action Scheduler] (2/2) - Please migrate your flows to use the included Scheduler device instead.';

    await this.homey.notifications.createNotification({
      excerpt: ntfy_deprecation_01,
    });

    await this.homey.notifications.createNotification({
      excerpt: ntfy_deprecation_02,
    });
  }

}

module.exports = AlarmUtils;
