'use strict';

const { isToday, isTomorrow, isThisWeek, isNextWeek } = require('../helpers');

// Cron Parser from https://github.com/harrisiirak/cron-parser
const cronParser = require('cron-parser');

exports.init = async function (ctx) {
	// App flow cards.
	const condition_IS_CRONTIME_MATCH = ctx.homey.flow.getConditionCard('is_crontime_match');
	condition_IS_CRONTIME_MATCH.registerRunListener(async (args, state) => {
		// Get Homey timezone.
		const myTimezone = await ctx.homey.clock.getTimezone();
		// Current date/time.
		const now = new Date();

		const result = isDateInCronExpression(now, args.cronExpr, myTimezone);
		console.log(`condition_IS_CRONTIME_MATCH - now: ${now}, expr: ${args.cronExpr}, result: ${result}, tz: ${myTimezone}`);
		return result;
	});

	// Device flow cards.
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

function isDateInCronExpression(date, cronExpression, timezone = 'UTC') {

	const weekDays = {
		mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
		monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0,
	};

	const lastDayOfMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30];

	const dateOptions = {
		timeZone: timezone,
		year: 'numeric', month: 'numeric', day: 'numeric',
		hour: 'numeric', minute: 'numeric', second: 'numeric',
		hour12: false, weekday: 'short',
	};

	// Convert date to local timezone as testValues.
	const testDateTime = date.toLocaleString('en-US', dateOptions);
	const testDateTimeParts = testDateTime.split(',');
	const testDateParts = testDateTimeParts[1].split('/');
	const testTimeParts = testDateTimeParts[2].split(':');
	const testDayOfWeek = weekDays[testDateTimeParts[0].toLowerCase().trim()];
	const testYear = parseInt(testDateParts[2], 10);
	const testMonth = parseInt(testDateParts[0], 10);
	const testDay = parseInt(testDateParts[1], 10);
	const testHour = parseInt(testTimeParts[0], 10);
	const testMinute = parseInt(testTimeParts[1], 10);
	// const testSecond = parseInt(testTimeParts[2], 10);

	// Check if the year is a leap year and adjust the last day of February accordingly.
	if ((testYear % 4 === 0 && testYear % 100 !== 0) || testYear % 400 === 0) lastDayOfMonth[1] = 29;

	try {
		const cronParsed = cronParser.parseExpression(cronExpression);
		const cronFields = JSON.parse(JSON.stringify(cronParsed.fields));
		console.log(`isDateInCronExpression - cronFields: ${JSON.stringify(cronFields)}`);

		// boolean for each test value if included in cronFields.value array
		const isMinute = cronFields.minute.includes(testMinute);
		const isHour = cronFields.hour.includes(testHour);
		const isDay = cronFields.dayOfMonth.includes(testDay);
		const isMonth = cronFields.month.includes(testMonth);
		const isDayOfWeek = cronFields.dayOfWeek.includes(testDayOfWeek);
		// If last of day of month, then check if cronFields.dayOfMonth includes 'L'
		const isLastDayOfMonth = ((testDay === lastDayOfMonth[testMonth - 1]) && cronFields.dayOfMonth.includes('L'));
		// If the DayOfWeek is within last seven days of the month, then check if cronFields.dayOfWeek includes '0L - 7L'
		const isLastWeekdayOfMonth = ((testDay > (lastDayOfMonth[testMonth - 1] - 7)) && cronFields.dayOfWeek.includes(`${testDayOfWeek}L`));

		return (isMinute && isHour && (isDay || isLastDayOfMonth) && isMonth && (isDayOfWeek || isLastWeekdayOfMonth));
	} catch (error) {
		console.error(`Invalid cron expression: ${error.message}`);
		return false;
	}
}
