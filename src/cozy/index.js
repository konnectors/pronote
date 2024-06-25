const identity = require("./identity");
const timetable = require("./timetable");

async function cozy_save(type, pronote, fields, options = {}) {
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