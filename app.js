'use strict';

const Homey = require('homey');
const { HomeyAPIApp } = require('homey-api');

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
    this.log('Alarms:', this.alarms);

    await this.initFlowActions();
    await this.flowTriggersAlarmListeners();
    await this.setCheckAlarmAPIInterval();

    this.log(`${this.myAppIdVersion} - onInit - started.`);
  }

  async initFlowActions() {
    // Action: Set alarm time
    const action_set_alarm_time = this.homey.flow.getActionCard('action_set_alarm_time');
    // Return a list of alarms for the flow card argument autocomplete.
    action_set_alarm_time.registerArgumentAutocompleteListener('alarm', async (query, args) => {
      const _alarms = Object.values(this.alarms);
      return _alarms.filter((_alarm) => {
        return _alarm.name.toLowerCase().includes(query.toLowerCase());
      });
    });
    // Run the action.
    action_set_alarm_time.registerRunListener(async (args, state) => {
      // const _alarm = this.alarms[args.alarm.id];
      await this.api.alarms.updateAlarm({
        id: args.alarm.id,
        alarm: {
          time: args.alarmtime,
        },
      });
      this.log(`${this.myAppIdVersion} - Action - action_set_alarm_time: "${args.alarm.name}" to "${args.alarmtime}"`);
    });
  }

  async flowTriggersAlarmListeners() {
    try {
      this.log(`${this.myAppIdVersion} - Found alarms: '${JSON.stringify(this.alarms)}'`);
      // Trigger when new alarm is created and update the alarm cache.
      this.api.alarms.on('alarm.create', async (alarm) => {
        this.alarms = await this.api.alarms.getAlarms();
        this.log(`${this.myAppIdVersion} - On create found alarms: '${JSON.stringify(this.alarms)}'`);
        this.homey.flow
          .getTriggerCard('alarm_created')
          .trigger({
            name: alarm.name,
            enabled: alarm.enabled,
            time: alarm.time,
            next: alarm.nextOccurance ? alarm.nextOccurance : '',
          })
          .catch(this.error)
          .then(this.log(`${this.myAppIdVersion} - Trigger - alarm_created: "${alarm.name}"`));
      });
      // Trigger when alarm is updated and update the alarm cache.
      this.api.alarms.on('alarm.update', async (alarm) => {
        this.alarms = await this.api.alarms.getAlarms();
        this.log(`${this.myAppIdVersion} - On update found alarms: '${JSON.stringify(this.alarms)}'`);
        this.homey.flow
          .getTriggerCard('alarm_updated')
          .trigger({
            name: alarm.name,
            enabled: alarm.enabled,
            time: alarm.time,
            next: alarm.nextOccurance ? alarm.nextOccurance : 'not scheduled',
          })
          .catch(this.error)
          .then(this.log(`${this.myAppIdVersion} - Trigger - alarm_updated: "${alarm.name}"`));
      });
      // When alarm is deleted, update the alarm cache. Not really useful to trigger a flow for now.
      // Future development, compare the alarms before and after the delete and trigger a flow with the deleted alarm.
      this.api.alarms.on('alarm.delete', async () => {
        this.log(`${this.myAppIdVersion} - Trigger - An alarm deleted.`);
        this.alarms = await this.api.alarms.getAlarms();
      });
    } catch (error) {
      this.log(`${this.homey.manifest.id} setAlarmUpdatedListeners - Error: '${error}'`);
    }
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
