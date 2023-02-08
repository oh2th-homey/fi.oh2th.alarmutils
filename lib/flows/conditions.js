'use strict';

exports.init = async function(ctx) {
  const condition_IS_ENABLED = ctx.homey.flow.getConditionCard('is_enabled');
  condition_IS_ENABLED.registerRunListener(async (args, state) => {
    return await args.device.getCapabilityValue('is_enabled') === true;
  });

  const condition_IS_SCHEDULED_IN = ctx.homey.flow.getConditionCard('is_scheduled_in');
  condition_IS_SCHEDULED_IN.registerRunListener(async (args, state) => {
    if (await args.device.getCapabilityValue('is_enabled') === true) {
      const timeNext = new Date(await args.device.getCapabilityValue('text_schedule_next'));
      if (timeNext - (args.minutes * 60 * 1000) < Date.now()) return true;
    }
    return false;
  });
};
