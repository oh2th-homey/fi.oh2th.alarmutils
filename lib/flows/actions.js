'use strict';

exports.init = async function(ctx) {
  //
  // Action Flow Card: Alarm time
  // Set selected alarms time from string args.alarmtime
  //
  const action_set_alarm_time = ctx.homey.flow.getActionCard('action_set_alarm_time');
  // Return a list of alarms for the flow card argument autocomplete.
  action_set_alarm_time.registerArgumentAutocompleteListener('alarm', async (query, args) => {
    const _alarms = Object.values(ctx.alarms);
    return _alarms.filter((_alarm) => {
      return _alarm.name.toLowerCase().includes(query.toLowerCase());
    });
  });
  // Run the action.
  action_set_alarm_time.registerRunListener(async (args, state) => {
    // const _alarm = ctx.alarms[args.alarm.id];
    await ctx.api.alarms.updateAlarm({
      id: args.alarm.id,
      alarm: {
        time: args.alarmtime,
      },
    });
    ctx.homey.app.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_time: '${args.alarm.name}' to ${args.alarmtime}`);
  });

  //
  // Action Flow Card: Set alarm ahead time (action_set_alarm_ahead_time)
  // Sets the time for an alarm in local time as HH:mm string. If any weekday is selected, the alarm will be repeated on those weekdays. If no weekday is selected, the alarm will run once.
  //
  const action_set_alarm_ahead_time = ctx.homey.flow.getActionCard('action_set_alarm_ahead_time');
  // Return a list of alarms for the flow card argument autocomplete.
  action_set_alarm_ahead_time.registerArgumentAutocompleteListener('alarm', async (query, args) => {
    const _alarms = Object.values(ctx.alarms);
    return _alarms.filter((_alarm) => {
      return _alarm.name.toLowerCase().includes(query.toLowerCase());
    });
  });
  // Run the action.
  action_set_alarm_ahead_time.registerRunListener(async (args, state) => {
    ctx.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_ahead_time: Requested '${args.alarm.name}' to ${args.minutes} mins before ${args.time}."`);
    // Grab the weekdays from the flow card arguments and create a repetition object for updateAlarm.
    const repetition = {
      monday: args.monday, tuesday: args.tuesday, wednesday: args.wednesday, thursday: args.thursday, friday: args.friday, saturday: args.saturday, sunday: args.sunday,
    };
    let alarmTime = strToMins(args.time) - args.minutes;
    // Handle negative time meaning minutes before midnight and set alarm time to previous day.
    if (alarmTime < 0) {
      alarmTime = 1440 + alarmTime;
      repetition.monday = args.tuesday;
      repetition.tuesday = args.wednesday;
      repetition.wednesday = args.thursday;
      repetition.thursday = args.friday;
      repetition.friday = args.saturday;
      repetition.saturday = args.sunday;
      repetition.sunday = args.monday;
    }
    ctx.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_ahead_time: '${args.alarm.name}' to ${minsToStr(alarmTime)} (${alarmTime} minutes) on ${JSON.stringify(repetition)}.`);
    try {
      await ctx.api.alarms.updateAlarm({
        id: args.alarm.id,
        alarm: {
          time: minsToStr(alarmTime),
          repetition,
        },
      });
    } catch (error) {
      ctx.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_ahead_time - Error: ${error}`);
    }
  });
};
