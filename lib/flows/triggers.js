'use strict';

exports.init = async function(ctx) {
  const device_schedule_trigger_in = ctx.homey.flow.getDeviceTriggerCard('device_schedule_trigger_in');
  device_schedule_trigger_in.registerRunListener(async (args, state) => {
    if (args.minutes !== state.minutes) return false;
    ctx.homey.app.log(`${ctx.myAppIdVersion} - Device: ${args.device.getName()} - device_schedule_trigger_in ${state.minutes} minutes.`);
    return true;
  });
};
