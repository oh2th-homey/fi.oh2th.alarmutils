'use strict';

const self = module.exports;

/**
 * @description Sleep for a given time in ms
 *
 * @param {Number} ms Time in milliseconds for sleep
 * @returns {Promise} Promise that resolves after ms milliseconds
 */
exports.sleep = async function (ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * @description Generate a random UUID
 *
 * @returns {String} Random UUID
 */
exports.randomUUID = function () {
	const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const uuidLength = 8;
	const timestamp = new Date().getTime().toString();
	let uuid = '';
	const seed = timestamp + characters;

	for (let i = 0; i < uuidLength; i++) {
		const randomIndex = Math.floor(Math.random() * seed.length);
		uuid += seed.charAt(randomIndex);
	}

	return uuid;
};

/**
 * @description Update the Capabilities discovered with checkCapabilities()
 * @param {Object} ctx - Homey context
 * @param {Array} driverCapabilities - Capabilities from the driver
 * @param {Array} deviceCapabilities - Capabilities from the device
 */
exports.updateCapabilities = function (ctx, driverCapabilities, deviceCapabilities) {
	try {
		const newC = driverCapabilities.filter((d) => !deviceCapabilities.includes(d));
		const oldC = deviceCapabilities.filter((d) => !driverCapabilities.includes(d));

		ctx.log(`${ctx.getName()} - Got old capabilities =>`, oldC);
		ctx.log(`${ctx.getName()} - Got new capabilities =>`, newC);

		oldC.forEach((c) => {
			ctx.log(`${ctx.getName()} - updateCapabilities => Remove `, c);
			ctx.removeCapability(c);
		});
		self.sleep(2000);
		newC.forEach((c) => {
			ctx.log(`${ctx.getName()} - updateCapabilities => Add `, c);
			ctx.addCapability(c);
		});
		self.sleep(2000);
	} catch (error) {
		ctx.log(error);
	}
};

/**
 * @description Check if Capabilities has changed and update them
 * @param {Object} ctx - Homey context
 * @returns {Object} deviceCapabilities - Device Capabilities
 */
exports.checkCapabilities = function (ctx) {
	try {
		const driverManifest = ctx.driver.manifest;
		const driverCapabilities = driverManifest.capabilities;
		const deviceCapabilities = ctx.getCapabilities();

		ctx.log(`${ctx.getName()} - checkCapabilities for`, driverManifest.id);
		ctx.log(`${ctx.getName()} - Found capabilities =>`, deviceCapabilities);

		self.updateCapabilities(ctx, driverCapabilities, deviceCapabilities);

		return deviceCapabilities;
	} catch (error) {
		ctx.log(error);
		return [];
	}
};

/**
 * @description Polling interval to update the device capability values
 * Synchonized to run on the minute
 * @param {Object} ctx - Homey context
 * @param {number} ms - Number of milliseconds for interval
 */
exports.startInterval = async function (ctx, ms) {
	// Calculate the time remaining until the next minute
	const now = new Date();
	const startDelay = (60 - now.getSeconds()) * 1000 + now.getMilliseconds();

	try {
		ctx.log(`${ctx.homey.manifest.id}/${ctx.homey.manifest.version} - onPollInterval =>`, ms);
		// Wait until the next minute before starting the interval
		ctx.setTimeout(() => {
			// Set the interval to run every 60 seconds
			ctx.onPollInterval = ctx.setInterval(ctx.onInterval.bind(ctx), ms);
		}, startDelay);
	} catch (error) {
		ctx.log(`${ctx.homey.manifest.id}/${ctx.homey.manifest.version} - error =>`, error);
	}
};

/**
 * @description Clear all intervals
 * @param {Object} ctx - Homey context
 */
exports.clearIntervals = async function (ctx) {
	try {
		ctx.log(`${ctx.homey.manifest.id}/${ctx.homey.manifest.version} - clearIntervals =>`, ms);
		clearInterval(ctx.onPollInterval);
	} catch (error) {
		ctx.log(`${ctx.homey.manifest.id}/${ctx.homey.manifest.version} - error =>`, error);
	}
};

/**
 * @description Convert string time value (HH:mm) to minutes
 *
 * @param {String} t String time format HH:mm
 * @returns {Number} Time in minutes
 */
exports.strToMins = function (t) {
	const s = t.split(':');
	return Number(s[0]) * 60 + Number(s[1]);
};

/**
 * @description Convert minutes to string time value (HH:mm)
 *
 * @param {Number} t Time in minutes
 * @returns {String} String time format HH:mm
 */
exports.minsToStr = function (m) {
	return `${Math.trunc(m / 60)}:${(`00${m % 60}`).slice(-2)}`;
};

/**
 * @description Test if given date is today
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is today
 */
exports.isToday = function (d) {
	const today = new Date();
	return d.getDate() === today.getDate()
    && d.getMonth() === today.getMonth()
    && d.getFullYear() === today.getFullYear();
};

/**
 * @description Test if given date is tomorrow
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is tomorrow
 */
exports.isTomorrow = function (d) {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return d.getDate() === tomorrow.getDate()
    && d.getMonth() === tomorrow.getMonth()
    && d.getFullYear() === tomorrow.getFullYear();
};

/**
 * @description Test if given date is weekend
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is weekend
 */
exports.isWeekend = function (d) {
	return d.getDay() === 0 || d.getDay() === 6;
};

/**
 * @description Test if given date is this week
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is this week
 */
exports.isThisWeek = function (d) {
	const today = new Date();
	const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
	const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
	return d >= firstDay && d <= lastDay;
};

/**
 * @description Test if given date is next week
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is next week
 */
exports.isNextWeek = function (d) {
	const today = new Date();
	const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 7));
	const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 13));
	return d >= firstDay && d <= lastDay;
};

/**
 * @description Test if given date is this month
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is this month
 */
exports.isThisMonth = function (d) {
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	return d >= firstDay && d <= lastDay;
};

/**
 * @description Test if given date is next month
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is next month
 */
exports.isNextMonth = function (d) {
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
	return d >= firstDay && d <= lastDay;
};
