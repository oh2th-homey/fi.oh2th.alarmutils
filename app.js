'use strict';

const Homey = require('homey');
const { HomeyAPIApp } = require('homey-api');
const { strToMins, minsToStr } = require('./lib/helpers');
const flowActions = require('./lib/flows/actions');
const flowTriggers = require('./lib/flows/triggers');

const INTERVAL = 5000;

class AlarmUtils extends Homey.App {

  async onInit() {
    this.myAppIdVersion = `${this.homey.manifest.id}/${this.homey.manifest.version}`;
    this.log(`${this.myAppIdVersion} - onInit - starting...`);

    this.api = new HomeyAPIApp({
      homey: this.homey,
      debug: true,
    });

    await this.api.alarms.connect();
    this.alarms = await this.api.alarms.getAlarms();
    this.log(`${this.myAppIdVersion} - Found alarms: '${JSON.stringify(this.alarms, null, 2)}'`);

    await flowActions.init(this);
    await flowTriggers.init(this);
    // await this.setCheckAlarmAPIInterval();

    this.log(`${this.myAppIdVersion} - onInit - started.`);
  }

  async checkAlarmAPIConnection() {
    try {
      if (!this.api.alarms.isConnected()) {
        this.log(`${this.myAppIdVersion} - checkAlarmAPIConnection - reconnecting.`);
        await this.api.alarms.connect();
        await this.clearIntervals();
        await this.setCheckAlarmAPIInterval();
      }
    } catch (error) {
      this.log(`${this.myAppIdVersion} - checkAlarmAPIConnection - Error: '${error}'`);
    }
  }

  async setCheckAlarmAPIInterval() {
    try {
      this.log(`${this.myAppIdVersion} - setInterval => ${INTERVAL}ms.`);
      this.onPollInterval = setInterval(this.checkAlarmAPIConnection.bind(this), INTERVAL);
    } catch (error) {
      this.log(`${this.myAppIdVersion} - checkAlarmAPIConnection - Error: '${error}'`);
    }
  }

  async clearIntervals() {
    try {
      this.log(`${this.myAppIdVersion} - clearIntervals.`);
      clearInterval(this.onPollInterval);
    } catch (error) {
      this.log(`${this.myAppIdVersion} - checkAlarmAPIConnection - Error: '${error}'`);
    }
  }

}

module.exports = AlarmUtils;
