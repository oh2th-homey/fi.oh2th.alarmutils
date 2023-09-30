'use strict';

const {
	isToday, isTomorrow, isThisWeek, isNextWeek,
} = require('../helpers');

exports.init = async function (ctx) {
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

	const condition_IS_SCHEDULED_TODAY = ctx.homey.flow.getConditionCard('is_scheduled_today');
	condition_IS_SCHEDULED_TODAY.registerRunListener(async (args, state) => {
		if (await args.device.getCapabilityValue('is_enabled') === true) {
			const timeNext = new Date(await args.device.getCapabilityValue('text_schedule_next'));
			return isToday(timeNext);
		}
		return false;
	});

	const condition_IS_SCHEDULED_TOMORROW = ctx.homey.flow.getConditionCard('is_scheduled_tomorrow');
	condition_IS_SCHEDULED_TOMORROW.registerRunListener(async (args, state) => {
		if (await args.device.getCapabilityValue('is_enabled') === true) {
			const timeNext = new Date(await args.device.getCapabilityValue('text_schedule_next'));
			return isTomorrow(timeNext);
		}
		return false;
	});

	const condition_IS_SCHEDULED_THIS_WEEK = ctx.homey.flow.getConditionCard('is_scheduled_this_week');
	condition_IS_SCHEDULED_THIS_WEEK.registerRunListener(async (args, state) => {
		if (await args.device.getCapabilityValue('is_enabled') === true) {
			const timeNext = new Date(await args.device.getCapabilityValue('text_schedule_next'));
			return isThisWeek(timeNext);
		}
		return false;
	});

	const condition_IS_SCHEDULED_NEXT_WEEK = ctx.homey.flow.getConditionCard('is_scheduled_next_week');
	condition_IS_SCHEDULED_NEXT_WEEK.registerRunListener(async (args, state) => {
		if (await args.device.getCapabilityValue('is_enabled') === true) {
			const timeNext = new Date(await args.device.getCapabilityValue('text_schedule_next'));
			return isNextWeek(timeNext);
		}
		return false;
	});
};
