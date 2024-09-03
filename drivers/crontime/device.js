'use strict';

const mainDevice = require('../main-device');
// CronTime from https://github.com/kelektiv/node-cron
const { CronTime } = require('cron');

module.exports = class CrontabDevice extends mainDevice {
  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    await this.schedulerDisable();

    this.log(`${this.getName()} - onAdded - done`);
  }

  /**
   * @description Get the cronTime string from the settings
   *
   * @param {Object} settings The settings object
   * @returns {Object} cronTime, timeZone, runOnce
   * @example
   * const { cronTime, timeZone, runOnce } = await this.getSettingsCronTime();
   * this.initCronJob(cronTime, timeZone, runOnce);
   *   cronTime: '0 0 12 * * 1-5'
   *   timeZone: 'Europe/Helsinki'
   *   runOnce: false (or true)
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
      return new Error(this.homey.__('settings.error.crontime_invalid'));
    }
  }
};
