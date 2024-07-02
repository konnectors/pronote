const {
  cozyClient,
  manifest
} = require('cozy-konnector-libs')

const doctypes = require('../../consts/doctypes.json');
const stack_log = require("../../utils/development/stack_log");

async function find_elements(pronote, fields, options) {
  const existingLessons = await cozyClient.data.findAll(doctypes['timetable']['lesson']);
  console.log(JSON.stringify(existingLessons, null, 2));
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      await find_elements(pronote, fields, options);

      stack_log('✅ All tests passed for test_timetable');
      resolve(true);
    }
    catch (error) {
      stack_log('🚨 Error in test_timetable: ' + error);
      resolve(false);
    }
  });
}

module.exports = init;