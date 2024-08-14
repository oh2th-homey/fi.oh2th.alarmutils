"use strict";

const Homey = require("homey");
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob } = require("cron");
// App specific modules.
const flowActions = require("./lib/flows/actions");
const flowConditions = require("./lib/flows/conditions");
const flowTriggers = require("./lib/flows/triggers");

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
    this.appCronJob.stop();
    this.appCronJob = undefined;
    this.log(`${this.myAppIdVersion} - onUninit - stopped.`);
  }

  async initAppCronJob() {
    this.log(`${this.myAppIdVersion} - initAppCronjob`);

    // create cronjob with cronTime and timeZone, do not start yet
    this.appCronJob = new CronJob(
      "0 * * * * *", // cronTime: every minute
      () => this.onAppInterval(), // onTick
      false, // onComplete
      true // start
      // timeZone: 'Europe/Amsterdam',
    );
  }

  async onAppInterval() {
    this.log(`${this.myAppIdVersion} - onAppInterval`);

    // Get all configured scheduler devices.
    const schedulerDriver = this.homey.drivers.getDriver("scheduler");
    const schedulerDevices = schedulerDriver.getDevices();
    const crontimeDriver = this.homey.drivers.getDriver("crontime");
    const crontimeDevices = crontimeDriver.getDevices();

    const devices = [...schedulerDevices, ...crontimeDevices];
    // Iterate over all active scheduler devices.
    devices.forEach((device) => {
      if (device.getCapabilityValue("is_enabled") === true) {
        const dateTimeNow = new Date();
        const tz = this.homey.clock.getTimezone();

        const nextScheduledTime = device.getNextScheduledTime();
        const dateTimeNext = new Date(nextScheduledTime);

        const scheduledTime = dateTimeNext.toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: tz,
        });

        const yyyy = dateTimeNext.toLocaleString("en-US", {
          year: "numeric",
          timeZone: tz,
        });
        const mm = dateTimeNext.toLocaleString("en-US", {
          month: "2-digit",
          timeZone: tz,
        });
        const dd = dateTimeNext.toLocaleString("en-US", {
          day: "2-digit",
          timeZone: tz,
        });
        const scheduledDate = `${yyyy}-${mm}-${dd}`;

        const state = {
          minutes:
            Math.abs(Math.floor((dateTimeNext - dateTimeNow) / 60000)) + 1,
        };

        const tokens = {
          name: device.getName(),
          date: scheduledDate,
          time: scheduledTime,
          next: nextScheduledTime,
          minutesToNext: state.minutes,
        };

        // If next trigger is in the future trigger the device_schedule_trigger_in flow card.
        if (dateTimeNext > dateTimeNow) {
          this.homey.flow
            .getDeviceTriggerCard("device_schedule_trigger_in")
            .trigger(device, tokens, state)
            .catch(this.error);
        }
      }
    });
  }
}

module.exports = AlarmUtils;
