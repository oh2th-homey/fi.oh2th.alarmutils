'use strict';

const { Device } = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob } = require('cron');

module.exports = class SchedulerDevice extends Device {

  async onInit() {
    this.log(`${this.getName()} - init`);
    const { cronTime, runOnce, timeZone } = await this.getSettingsCronTime();
    this.initCronJob(cronTime, runOnce, timeZone);
    this.initCapabilityListeners();
    this.log(`${this.getName()} - init done`);
  }

  async onAdded() {
    this.log(`${this.getName()} - has been added`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} - settings where changed`);
  }

  async onRenamed(name) {
    this.log(`${this.getName()} - was renamed`);
  }

  async onDeleted() {
    this.clearIntervals();
    this.log(`${this.getName()} - has been deleted`);
  }

  async getSettingsCronTime() {
    const settings = this.getSettings();

    const hours = settings.time.split(':')[0];
    const minutes = settings.time.split(':')[1];
    let runOnce = false;
    let weekdays = [
      settings.repeat_sundays ? '0' : null,
      settings.repeat_mondays ? '1' : null,
      settings.repeat_tuesdays ? '2' : null,
      settings.repeat_wednesdays ? '3' : null,
      settings.repeat_thursdays ? '4' : null,
      settings.repeat_fridays ? '5' : null,
      settings.repeat_saturdays ? '6' : null,
    ].filter((element) => {
      return element;
    }).join(',');
    if (weekdays === '') {
      weekdays = '*';
      runOnce = true;
    } else if (weekdays === '0,1,2,3,4,5,6') {
      weekdays = '*';
      runOnce = false;
    }
    // const cronTime = `0 ${minutes} ${hours} * * ${weekdays}`;
    const cronTime = '0 * * * * *';
    const timeZone = settings.timezone;
    return { cronTime, runOnce, timeZone };
  }

  async initCronJob(cronTime, runOnce, timeZone) {
    this.log(`${this.getName()} - initCronjob - cronTime: ${cronTime}, runOnce: ${runOnce}, timeZone: ${timeZone}`);

    this.cronJob = new CronJob({
      cronTime,
      onTick: () => {
        this.log(`${this.getName()} - cron tick at ${new Date().toISOString()}`);
        this.runTriggers();
      },
      start: false,
      timeZone,
    });

    // add callback to cronjob to enable/disable cronjob on runOnce
    this.cronJob.addCallback(() => {
      this.log(`${this.getName()} - cron callback`);
      if (runOnce) {
        this.setCapabilityValue('is_enabled', false);
        this.cronJob.stop();
      }
    });

    // start cronjob if enabled
    if (this.getCapabilityValue('is_enabled')) {
      this.cronJob.start();
      this.log(`${this.getName()} - initCronjob - cronjob started`);
    }

    this.log(`${this.getName()} - initCronjob - next tick at ${this.cronJob.nextDates(1)}`);
  }

  async initCapabilityListeners() {
    this.log(`${this.getName()} - initCapabilityListeners`);
    this.registerCapabilityListener('is_enabled', this.onCapability_ENABLED.bind(this));
  }

  async onCapability_ENABLED(value) {
    this.log(`${this.getName()} - onCapability_ENABLED {${value}}`);
    try {
      if (value) return Promise.resolve(this.cronJob.start());
      return Promise.resolve(this.cronJob.stop());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async runTriggers() {
    this.log(`${this.getName()} - runTriggers`);
    // this.triggerFlowCard('trigger');
  }

};
