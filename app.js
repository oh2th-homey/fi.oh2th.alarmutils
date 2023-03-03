'use strict';

const Homey = require('homey');
const { HomeyAPIApp } = require('homey-api');
const { strToMins, minsToStr } = require('./lib/helpers');
const flowActions = require('./lib/flows/actions');
const flowConditions = require('./lib/flows/conditions');
const appFlowActions = require('./lib/app-flows/actions');
const appFlowActions2 = require('./lib/app-flows/actions-platform2');
const appFlowTriggers = require('./lib/app-flows/triggers');

const INTERVAL = 5000;

class AlarmUtils extends Homey.App {

  async onInit() {
    this.myAppIdVersion = `${this.homey.manifest.id}/${this.homey.manifest.version}`;
    this.log(`${this.myAppIdVersion} - onInit - starting...`);

    // Init device flow cards.
    await flowActions.init(this);
    await flowConditions.init(this);

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

    this.log(`${this.myAppIdVersion} - onInit - started.`);
  }

  async clearIntervals() {
    try {
      this.log(`${this.myAppIdVersion} - clearIntervals.`);
      clearInterval(this.onPollInterval);
    } catch (error) {
      this.log(`${this.myAppIdVersion} - clearIntervals - Error: '${error}'`);
    }
  }

  async sendNotifications() {
    const ntfy_deprecation_01 = '[Action Scheduler] (1/2) - Support for the Homey Alarms API will be removed in a future version of this app.';
    const ntfy_deprecation_02 = '[Action Scheduler] (2/2) - Please migrate your flows to use the included Scheduler devices instead of the Homey Alarms.';
    const ntfy_deprecation_03 = '[Action Scheduler] (3/3) - Homey Pro 2023 devices will not support the Homey Alarms API.';

    await this.homey.notifications.createNotification({
      excerpt: ntfy_deprecation_01,
    }).then((result) => {
      console.log(result);
    }).catch((err) => {
      console.error(err);
    });

    await this.homey.notifications.createNotification({
      excerpt: ntfy_deprecation_02,
    }).then((result) => {
      console.log(result);
    }).catch((err) => {
      console.error(err);
    });

    if (this.homey.platform === 'local' && this.homey.platformVersion === 2) {
      await this.homey.notifications.createNotification({
        excerpt: ntfy_deprecation_03,
      }).then((result) => {
        console.log(result);
      }).catch((err) => {
        console.error(err);
      });
    }
  }

}

module.exports = AlarmUtils;
