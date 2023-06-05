'use strict';

const { Device } = require('homey');
// CronJob from https://github.com/kelektiv/node-cron
const { CronJob, CronTime } = require('cron');
const { strToMins, minsToStr, checkCapabilities } = require('../../lib/helpers');

module.exports = class SchedulerDevice extends Device {

  async onInit() {
    this.log(`${this.getName()} - onInit`);

    // For validating time string input from action cards and settings
    // Test against valid time string formats:
    // 13:00
    // *:*
    // 00:*
    // 01:*/5
    // Test against invalid time string formats:
    // 24:00
    // 12:60
    // */2:*/70
    //
    // If this is updated, also update the regex in the pair/scheduler.html file
    this.timePattern = new RegExp(/^(\b([0-9]|[01][0-9]|2[0-3])\b|(\*)((\/)(\b([2-9]|1[0-9]|2[0-4])\b))?):(\b([0-9]|[0-5][0-9])\b|(\*)((\/)(\b([2-9]|[1-5][0-9]|60)\b))?)$/);

    checkCapabilities(this);
    await this.initCapabilityListeners();

    const settings = this.getSettings();
    const { cronTime, timeZone, runOnce } = this.getSettingsCronTime(settings);
    this.initCronJob(cronTime, timeZone, runOnce);

    this.log(`${this.getName()} - onInit - done`);
  }

  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    const {
      repeat_monday, repeat_tuesday, repeat_wednesday, repeat_thursday,
      repeat_friday, repeat_saturday, repeat_sunday,
    } = this.getSettings();
    if (!repeat_monday && !repeat_tuesday && !repeat_wednesday && !repeat_thursday && !repeat_friday && !repeat_saturday && !repeat_sunday) {
      this.schedulerDisable();
    } else {
      this.schedulerEnable();
    }

    this.log(`${this.getName()} - onAdded - done`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} - onSettings - changedKeys: ${changedKeys}`);

    // Check input from newSettings for time string format
    if (changedKeys.includes('time')) {
      if (!this.timePattern.test(newSettings.time)) {
        this.error(`${this.getName()} - onSettings - Invalid time string format: ${newSettings.time}`);
        return Promise.reject(new Error(this.homey.__('settings.error.time_invalid')));
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

  async onRenamed(name) {
    this.log(`${this.getName()} - onRenamed`);
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
    const hours = settings.time.split(':')[0];
    const minutes = settings.time.split(':')[1];
    const runOnce = settings.runonce;
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
      this.setCapabilityValue('is_enabled', false);
    } else if (weekdays === '0,1,2,3,4,5,6') {
      weekdays = '*';
      this.setCapabilityValue('is_enabled', true);
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
        this.cronJobRunTriggers(runOnce);
        this.updateScheduleCapabilityValues();
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
    const timeNext = await this.initCronJob(cronTime, timeZone, runOnce);

    this.homey.flow.getDeviceTriggerCard('device_schedule_updated')
      .trigger(this, {
        name: this.getName(),
        enabled: this.getCapabilityValue('is_enabled'),
        time: settings.time,
        next: String(timeNext),
      })
      .catch(this.error)
      .then(this.log(`${this.getName()} - restartCronJob - device_schedule_updated at ${String(timeNext)}`));
  }

  /**
   * @description Enable cronjob
   */
  async schedulerEnable() {
    this.log(`${this.getName()} - schedulerEnable`);
    this.cronJob.start();
    await this.setCapabilityValue('is_enabled', true);
    this.updateScheduleCapabilityValues();
  }

  /**
   * @description Disable cronjob
   */
  async schedulerDisable() {
    this.log(`${this.getName()} - schedulerDisable`);
    this.cronJob.stop();
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

    const timeNow = new Date().toLocaleString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.homey.clock.getTimezone(),
    });

    let timeNext = this.getNextScheduledTime();
    if (runOnce) timeNext = String(null);
    this.homey.flow.getDeviceTriggerCard('device_schedule_triggered')
      .trigger(this, {
        name: this.getName(),
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

    if (!this.timePattern.test(time)) {
      this.error(`${this.getName()} - onSettings - Invalid time string format: ${time}`);
      return Promise.reject(new Error(this.homey.__('settings.error.time_invalid')));
    }

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

};
