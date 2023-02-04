'use strict';

const { Device } = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob, CronTime } = require('cron');

module.exports = class SchedulerDevice extends Device {

  async onInit() {
    this.log(`${this.getName()} - onInit`);

    this.initCapabilityListeners();

    const settings = this.getSettings();
    const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(settings);
    this.initCronJob(cronTime, timeZone, runOnce);

    this.log(`${this.getName()} - onInit - done`);
  }

  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    // start cronjob if enabled
    this.cronJob.start();
    this.log(`${this.getName()} - onAdded - next at ${this.cronJob.nextDates(1)}`);
    this.log(`${this.getName()} - onAdded - done`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} - onSettings - changedKeys: ${changedKeys}`);

    if (typeof this.cronJob !== 'undefined') {
      this.log(`${this.getName()} - onSettings - stopping cronjob`);
      this.cronJob.stop();
      this.cronJob = undefined;
    }

    const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(newSettings);
    this.initCronJob(cronTime, timeZone, runOnce);

    this.log(`${this.getName()} - onSettings - done`);
  }

  async onRenamed(name) {
    this.log(`${this.getName()} - onRenamed`);
  }

  async onDeleted() {
    if (typeof this.cronJob !== 'undefined') {
      this.log(`${this.getName()} - onDeleted - stopping cronjob`);
      this.cronJob.stop();
      this.cronJob = undefined;
    }
    this.log(`${this.getName()} - onDeleted - done`);
  }

  /**
   * @description Get the cronTime string from the settings
   *
   * @param {Object} settings The settings object
   * @returns {Object} cronTime, runOnce, timeZone
   * @example
   * const { cronTime, runOnce, timeZone } = await this.getSettingsCronTime();
   * this.initCronJob(cronTime, runOnce, timeZone);
   * // cronTime: '0 0 12 * * 1-5'
   * // timeZone: 'Europe/Helsinki'
   * // runOnce: false - if any weekday is selected, runOnce will be false
   */
  getSettingsCronTime(settings) {
    const hours = settings.time.split(':')[0];
    const minutes = settings.time.split(':')[1];
    let runOnce = false;
    let weekdays = [
      settings.repeat_sunday ? '0' : null,
      settings.repeat_monday ? '1' : null,
      settings.repeat_tuesday ? '2' : null,
      settings.repeat_wednesday ? '3' : null,
      settings.repeat_thursday ? '4' : null,
      settings.repeat_friday ? '5' : null,
      settings.repeat_saturday ? '6' : null,
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

    const cronTime = `0 ${minutes} ${hours} * * ${weekdays}`;
    const timeZone = settings.timezone;
    return { cronTime, timeZone, runOnce };
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
    this.cronJob = new CronJob({
      cronTime,
      onTick: () => {
        this.log(`${this.getName()} - cronJob - tick at ${new Date().toISOString()}`);
        this.runTriggers();
      },
      start: false,
      timeZone,
    });

    // add callback to cronjob to enable/disable cronjob on runOnce
    this.cronJob.addCallback(() => {
      this.log(`${this.getName()} - cronJob - callback`);
      if (runOnce) {
        this.setCapabilityValue('is_enabled', false);
        this.cronJob.stop();
        this.log(`${this.getName()} - cronJob - runOnce - not running again`);
        return;
      }
      this.log(`${this.getName()} - cronJob - next at ${this.cronJob.nextDates(1)}`);
    });

    // start cronjob if enabled
    if (this.getCapabilityValue('is_enabled')) {
      this.cronJob.start();
      this.log(`${this.getName()} - initCronjob - cronjob started`);
      this.log(`${this.getName()} - initCronjob - next at ${this.cronJob.nextDates(1)}`);
    }
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

    const timeNow = new Date().toLocaleString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.homey.clock.getTimezone(),
    });
    const timeNext = String(this.cronJob.nextDates(1));

    await this.homey.flow
      .getDeviceTriggerCard('device_schedule_triggered')
      .trigger(this, {
        name: this.getName(),
        time: timeNow,
        next: timeNext,
      })
      .catch(this.error)
      .then(this.log(`${this.getName()} - runTriggers - device_schedule_triggered at ${timeNow} next at ${timeNext}`));

    this.log(`${this.getName()} - runTriggers - done`);
  }

};
