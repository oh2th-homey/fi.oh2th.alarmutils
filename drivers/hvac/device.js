'use strict';

const mainDevice = require('../main-device');
// CronTime from https://github.com/kelektiv/node-cron
const { CronTime } = require('cron');

module.exports = class HVACDevice extends mainDevice {
  async onAdded() {
    this.log(`${this.getName()} - onAdded`);

    // Get the settings

    this.log(`${this.getName()} - onAdded - done`);
  }

};
