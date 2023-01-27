'use strict';

/**
 * Convert string time value (HH:mm) to minutes
 *
 * @param {String} t String time format HH:mm
 * @returns {Number} Time in minutes
 */
exports.strToMins = function(t) {
  const s = t.split(':');
  return Number(s[0]) * 60 + Number(s[1]);
};

/**
 * Convert minutes to string time value (HH:mm)
 *
 * @param {Number} t Time in minutes
 * @returns {String} String time format HH:mm
 */
exports.minsToStr = function(m) {
  return `${Math.trunc(m / 60)}:${(`00${m % 60}`).slice(-2)}`;
};
