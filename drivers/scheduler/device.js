'use strict';

const { Device } = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob, CronTime } = require('cron');
const { strToMins, minsToStr, sleep } = require('../../lib/helpers');

module.exports = class SchedulerDevice extends Device {

  async onInit() {
    this.log(`${this.getName()} - onInit`);

    await this.checkCapabilities();
    await this.initCapabilityListeners();

    const settings = this.getSettings();
    const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(settings);
    this.initCronJob(cronTime, timeZone, runOnce);

    this.log(`${this.getName()} - onInit - done`);
  }

  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    // start cronjob if enabled
    this.cronJob.start();
    this.setCapabilityValue('is_enabled', true);
    this.setCapability_TEXT_SCHEDULE_NEXT(this.getNextScheduledTime());
    this.log(`${this.getName()} - onAdded - done`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} - onSettings - changedKeys: ${changedKeys}`);

    // Check input from newSettings for time string format
    // Test against valid time string formats:
    // 13:00
    // *:*
    // 00:*
    // 01:*/5
    // Test against invalid time string formats:
    // 24:00
    // 12:60
    // */2:*/70
    // If this is updated, also update the regex in the pair/scheduler.html file
    const timePattern = new RegExp(/^(\b([0-9]|[01][0-9]|2[0-3])\b|(\*)((\/)(\b([2-9]|1[0-9]|2[0-4])\b))?):(\b([0-9]|[0-5][0-9])\b|(\*)((\/)(\b([2-9]|[1-5][0-9]|60)\b))?)$/);
    if (changedKeys.includes('time')) {
      if (!timePattern.test(newSettings.time)) {
        this.error(`${this.getName()} - onSettings - Invalid time string format: ${newSettings.time}`);
        return Promise.reject(new Error(this.homey.__('settings.error.time_invalid')));
      }
    }

    this.restartCronJob(newSettings);

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

    try {
      // eslint-disable-next-line no-new
      new CronTime(cronTime, timeZone);
      return { cronTime, timeZone, runOnce };
    } catch (error) {
      this.error(`${this.getName()} - getSettingsCronTime - Time = [${cronTime}], Timezone = [${timeZone}] error: ${error}`);
    }
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
        this.cronJobRunTriggers();
      },
      start: false,
      timeZone,
    });

    // add callback to cronjob to enable/disable cronjob on runOnce
    this.cronJob.addCallback(() => {
      this.log(`${this.getName()} - cronJob - callback`);
      if (runOnce) {
        this.schedulerDisable();
        this.log(`${this.getName()} - cronJob - runOnce - not running again`);
        return;
      }
      this.setCapability_TEXT_SCHEDULE_NEXT(this.getNextScheduledTime());
    });

    // start cronjob if enabled
    if (this.getCapabilityValue('is_enabled')) {
      this.cronJob.start();
      this.log(`${this.getName()} - initCronjob - cronjob started`);
      this.setCapability_TEXT_SCHEDULE_NEXT(this.getNextScheduledTime());
    }
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
    this.initCronJob(cronTime, timeZone, runOnce);

    const timeNext = this.getNextScheduledTime();
    this.homey.flow.getDeviceTriggerCard('device_schedule_updated')
      .trigger(this, {
        name: this.getName(),
        enabled: this.getCapabilityValue('is_enabled'),
        time: settings.time,
        next: timeNext[0].toString(),
      })
      .catch(this.error)
      .then(this.log(`${this.getName()} - restartCronJob - device_schedule_updated at ${timeNext}`));
  }

  /**
   * @description Enable cronjob
   */
  async schedulerEnable() {
    this.log(`${this.getName()} - schedulerEnable`);
    this.setCapabilityValue('is_enabled', true);
    this.cronJob.start();
  }

  /**
   * @description Disable cronjob
   */
  async schedulerDisable() {
    this.log(`${this.getName()} - schedulerDisable`);
    this.setCapabilityValue('is_enabled', false);
    this.cronJob.stop();
  }

  /**
   * @description get next scheduled time
   * @returns {String} next scheduled time
   */
  getNextScheduledTime() {
    return String(this.cronJob.nextDates(1));
  }

  /**
   * @description Trigger flow cards for cronjob
   */
  async cronJobRunTriggers() {
    this.log(`${this.getName()} - runTriggers`);

    const timeNow = new Date().toLocaleString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.homey.clock.getTimezone(),
    });

    this.homey.flow.getDeviceTriggerCard('device_schedule_triggered')
      .trigger(this, {
        name: this.getName(),
        time: timeNow,
        next: getNextScheduledTime(),
      })
      .catch(this.error)
      .then(this.log(`${this.getName()} - runTriggers - device_schedule_triggered at ${timeNow} next at ${getNextScheduledTime()}`));

    this.log(`${this.getName()} - runTriggers - done`);
  }

  async setCapability_TEXT_SCHEDULE_NEXT(scheduleNext) {
    this.log(`${this.getName()} - setCapability_TEXT_SCHEDULE_NEXT - ${scheduleNext}`);
    this.setCapabilityValue('text_schedule_next', scheduleNext);
  }

  /**
   * Handle capability listeners
   */
  async initCapabilityListeners() {
    this.log(`${this.getName()} - initCapabilityListeners`);
    this.registerCapabilityListener('is_enabled', this.onCapability_IS_DEVICE_SCHEDULE_ENABLED.bind(this));
  }

  async onCapability_IS_DEVICE_SCHEDULE_ENABLED(value) {
    this.log(`${this.getName()} - onCapability_ENABLED {${value}}`);
    try {
      if (value) return Promise.resolve(this.cronJob.start());
      return Promise.resolve(this.cronJob.stop());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Handle action listeners
   */
  async onAction_DEVICE_SCHEDULE_ENABLED(enabled) {
    this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_ENABLED '${enabled}'`);
    if (enabled) this.schedulerEnable();
    else this.schedulerDisable();
    this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_ENABLED - done`);
  }

  async onAction_DEVICE_SCHEDULE_TIME(time) {
    this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_TIME '${time}'`);
    await this.setSettings({
      time,
    });
    this.restartCronJob(this.getSettings());
    this.log(`${this.getName()} - onAction_DEVICE_SCHEDULE_TIME - done`);
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

  /**
   * Check if Capabilities has changed and update them
   */
  async checkCapabilities() {
    try {
      const driverManifest = this.driver.manifest;
      const driverCapabilities = driverManifest.capabilities;
      const deviceCapabilities = this.getCapabilities();

      this.log(`[Device] ${this.getName()} - checkCapabilities for`, driverManifest.id);
      this.log(`[Device] ${this.getName()} - Found capabilities =>`, deviceCapabilities);

      await this.updateCapabilities(driverCapabilities, deviceCapabilities);

      return deviceCapabilities;
    } catch (error) {
      this.log(error);
    }
  }

  async updateCapabilities(driverCapabilities, deviceCapabilities) {
    try {
      const newC = driverCapabilities.filter((d) => !deviceCapabilities.includes(d));
      const oldC = deviceCapabilities.filter((d) => !driverCapabilities.includes(d));

      this.log(`[Device] ${this.getName()} - Got old capabilities =>`, oldC);
      this.log(`[Device] ${this.getName()} - Got new capabilities =>`, newC);

      oldC.forEach((c) => {
        this.log(`[Device] ${this.getName()} - updateCapabilities => Remove `, c);
        this.removeCapability(c);
      });
      await sleep(2000);
      newC.forEach((c) => {
        this.log(`[Device] ${this.getName()} - updateCapabilities => Add `, c);
        this.addCapability(c);
      });
      await sleep(2000);
    } catch (error) {
      this.log(error);
    }
  }

};
