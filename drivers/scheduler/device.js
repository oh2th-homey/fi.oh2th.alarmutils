'use strict';

const mainDevice = require('../main-device');
// CronTime from https://github.com/kelektiv/node-cron
const { CronTime } = require('cron');

module.exports = class SchedulerDevice extends mainDevice {
  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    const { repeat_monday, repeat_tuesday, repeat_wednesday, repeat_thursday, repeat_friday, repeat_saturday, repeat_sunday } = this.getSettings();
    if (!repeat_monday && !repeat_tuesday && !repeat_wednesday && !repeat_thursday && !repeat_friday && !repeat_saturday && !repeat_sunday) {
      this.schedulerDisable();
    } else {
      this.schedulerEnable();
    }

    this.log(`${this.getName()} - onAdded - done`);
  }

  /**
   * @description set the crontime pattern
   */
  // For validating crontime string input from action cards and settings
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
  // If this is updated, also update the regex in the pair/configure.html file
  setCronTimePattern() {
    // eslint-disable-next-line max-len, no-useless-escape
    this.cronTimePattern = new RegExp(
      /^(\*|(?:\*|(?:\*|(?:0?[0-9]|1[0-9]|2[0-3])))\/(?:0?[0-9]|1[0-9]|2[0-3])|(?:0?[0-9]|1[0-9]|2[0-3])(?:(?:\-(?:0?[0-9]|1[0-9]|2[0-3]))?|(?:\,(?:0?[0-9]|1[0-9]|2[0-3]))*)):(\*|(?:\*|(?:[0-9]|(?:[0-5][0-9])))\/(?:[0-9]|(?:[0-5][0-9]))|(?:[0-9]|(?:[0-5][0-9]))(?:(?:\-[0-9]|\-(?:[1-5][0-9]))?|(?:\,(?:[0-9]|(?:[0-5][0-9])))*))$/
    );
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
    ]
      .filter((element) => element)
      .join(',');

    if (weekdays === '' || weekdays === '0,1,2,3,4,5,6') weekdays = '*';

    const cronTime = `0 ${minutes} ${hours} * * ${weekdays}`;
    const timeZone = settings.timezone;

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
