'use strict';

const { sleep } = require('../helpers');

exports.init = async function(ctx) {
  try {
    //
    // Trigger when new alarm is created and update the alarm cache.
    //
    ctx.api.alarms.on('alarm.create', async (alarm) => {
      // Update the alarm cache.
      ctx.alarms = await ctx.api.alarms.getAlarms();
      ctx.log(`${ctx.myAppIdVersion} - On create found alarms: ${JSON.stringify(ctx.alarms, null, 2)}`);
      ctx.homey.flow
        .getTriggerCard('alarm_created')
        .trigger({
          name: alarm.name,
          enabled: alarm.enabled,
          time: alarm.time,
          next: alarm.nextOccurance ? alarm.nextOccurance : 'not scheduled',
        })
        .catch(ctx.error)
        .then(ctx.log(`${ctx.myAppIdVersion} - Trigger - alarm_created: '${alarm.name}'`));
    });

    //
    // Trigger when alarm is updated and update the alarm cache.
    //
    ctx.api.alarms.on('alarm.update', async (alarm) => {
      // Update the alarm cache.
      ctx.alarms = await ctx.api.alarms.getAlarms();
      ctx.log(`${ctx.myAppIdVersion} - Updated alarm: ${JSON.stringify(alarm, null, 2)}`);
      ctx.homey.flow
        .getTriggerCard('alarm_updated')
        .trigger({
          name: alarm.name,
          enabled: alarm.enabled,
          time: alarm.time,
          next: alarm.nextOccurance ? alarm.nextOccurance : 'not scheduled',
        })
        .catch(ctx.error)
        .then(ctx.log(`${ctx.myAppIdVersion} - Trigger - alarm_updated: '${alarm.name}'`));
    });

    //
    // When alarm is deleted, update the alarm cache. Not really useful to trigger a flow for now.
    // Future development, compare the alarms before and after the delete and trigger a flow with the deleted alarm.
    //
    ctx.api.alarms.on('alarm.delete', async () => {
      ctx.log(`${ctx.myAppIdVersion} - Trigger - An alarm deleted.`);
      ctx.alarms = await ctx.api.alarms.getAlarms();
    });
  } catch (error) {
    ctx.log(`${ctx.homey.manifest.id} Init triggers - Error: '${error}'`);
  }
};
