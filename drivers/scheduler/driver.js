'use strict';

const { randomUUID } = require('crypto');
const { Driver } = require('homey');

module.exports = class SchedulerDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Scheduler has been initialized');
  }

  async onPair(session) {
    this.log('onPair new session...');
  }

};
