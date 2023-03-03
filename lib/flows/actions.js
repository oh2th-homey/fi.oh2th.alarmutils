'use strict';

exports.init = async function(ctx) {
  /**
   * Device Action cards
   */
  const action_IS_ENABLED = ctx.homey.flow.getActionCard('device_is_enabled');
  action_IS_ENABLED.registerRunListener(async (args, state) => {
    await args.device.onCapability_IS_ENABLED(args.enabled);
  });

  const action_DEVICE_SCHEDULE_TIME = ctx.homey.flow.getActionCard('device_schedule_time');
  action_DEVICE_SCHEDULE_TIME.registerRunListener(async (args, state) => {
    await args.device.onAction_DEVICE_SCHEDULE_TIME(args.time);
  });

  const action_DEVICE_SCHEDULE_AHEAD_TIME = ctx.homey.flow.getActionCard('device_schedule_ahead_time');
  action_DEVICE_SCHEDULE_AHEAD_TIME.registerRunListener(async (args, state) => {
    await args.device.onAction_DEVICE_SCHEDULE_AHEAD_TIME(args);
  });
};
