const { log } = require('cozy-konnector-libs')

const identity = require("./pronote/identity");
const timetable = require("./pronote/timetable");

async function cozy_save(type, pronote, fields, options = {}) {
  log('info', 'Saving ' + type);

  switch (type) {
    case 'identity':
      return identity(pronote, fields, options);
    case 'timetable':
      return timetable(pronote, fields, options);
    default:
      return false;
  }
}

module.exports = cozy_save;