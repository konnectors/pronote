const stack_log = require('../utils/development/stack_log');

const identity = require("./pronote/identity");
const timetable = require("./pronote/timetable");

const test_timetable = require("./tests/test_timetable");

async function cozy_save(type, pronote, fields, options = {}) {
  stack_log('🔁 Saving ' + type);

  switch (type) {
    case 'identity':
      return identity(pronote, fields, options);
    case 'timetable':
      return timetable(pronote, fields, options);
    default:
      return false;
  }
}

async function cozy_test(type, pronote, fields, options = {}) {
  stack_log('🤔 Testing ' + type);

  switch (type) {
    case 'timetable':
      return test_timetable(pronote, fields, options);
    default:
      return false;
  }
}

module.exports = {
  cozy_save,
  cozy_test
};