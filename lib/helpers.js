'use strict';

/**
 * @description Sleep for a given time in ms
 *
 * @param {Number} ms Time in milliseconds for sleep
 * @returns {Promise} Promise that resolves after ms milliseconds
 */
exports.sleep = async function(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * @description Convert string time value (HH:mm) to minutes
 *
 * @param {String} t String time format HH:mm
 * @returns {Number} Time in minutes
 */
exports.strToMins = function(t) {
  const s = t.split(':');
  return Number(s[0]) * 60 + Number(s[1]);
};

/**
 * @description Convert minutes to string time value (HH:mm)
 *
 * @param {Number} t Time in minutes
 * @returns {String} String time format HH:mm
 */
exports.minsToStr = function(m) {
  return `${Math.trunc(m / 60)}:${(`00${m % 60}`).slice(-2)}`;
};

/**
 * @description Test if given date is today
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is today
 */
exports.isToday = function(d) {
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
exports.isTomorrow = function(d) {
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
exports.isWeekend = function(d) {
  return d.getDay() === 0 || d.getDay() === 6;
};

/**
 * @description Test if given date is this week
 *
 * @param {Date} d Date to test
 * @returns {Boolean} True if date is this week
 */
exports.isThisWeek = function(d) {
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
exports.isNextWeek = function(d) {
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
exports.isThisMonth = function(d) {
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
exports.isNextMonth = function(d) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return d >= firstDay && d <= lastDay;
};
