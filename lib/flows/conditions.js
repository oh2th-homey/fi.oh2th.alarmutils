'use strict';

exports.init = async function(ctx) {
  const condition_IS_ENABLED = ctx.homey.flow.getConditionCard('is_enabled');
  condition_IS_ENABLED.registerRunListener(async (args, state) => {
    return await args.device.getCapabilityValue('is_enabled') === true;
  });
};
