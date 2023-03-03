'use strict';

exports.init = async function(ctx) {
  //
  // Action Flow Card: Alarm time
  // Set selected alarms time from string args.alarmtime
  //
  const action_set_alarm_time = ctx.homey.flow.getActionCard('action_set_alarm_time');
  // Return a list of alarms for the flow card argument autocomplete.
  action_set_alarm_time.registerArgumentAutocompleteListener('alarm', async (query, args) => {
    const _alarms = {
      'not-supported': {
        id: 'not-supported',
        name: 'Not supported on this device',
        time: '00:00',
        enabled: false,
        repetition: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
        nextOccurance: null,
      },
    };
    return _alarms.filter((_alarm) => {
      return _alarm.name.toLowerCase().includes(query.toLowerCase());
    });
  });
  // Run the action.
  action_set_alarm_time.registerRunListener(async (args, state) => {
    ctx.homey.app.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_time: Not supported on this Homey version.`);
    throw new Error('Not supported on this Homey version - Use the Scheduler Device instead.');
  });

  //
  // Action Flow Card: Set alarm ahead time (action_set_alarm_ahead_time)
  // Sets the time for an alarm in local time as HH:mm string. If any weekday is selected, the alarm will be repeated on those weekdays. If no weekday is selected, the alarm will run once.
  //
  const action_set_alarm_ahead_time = ctx.homey.flow.getActionCard('action_set_alarm_ahead_time');
  // Return a list of alarms for the flow card argument autocomplete.
  action_set_alarm_ahead_time.registerArgumentAutocompleteListener('alarm', async (query, args) => {
    const _alarms = {
      'not-supported': {
        id: 'not-supported',
        name: 'Not supported on this Homey version',
        time: '00:00',
        enabled: false,
        repetition: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
        nextOccurance: null,
      },
    };
    return _alarms.filter((_alarm) => {
      return _alarm.name.toLowerCase().includes(query.toLowerCase());
    });
  });
  // Run the action.
  action_set_alarm_ahead_time.registerRunListener(async (args, state) => {
    ctx.homey.app.log(`${ctx.myAppIdVersion} - Action - action_set_alarm_time: Not supported on this Homey version.`);
    throw new Error('Not supported on this Homey version - Use the Scheduler Device instead.');
  });
};
