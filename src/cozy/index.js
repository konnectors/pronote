const identity = require("./identity");

async function cozy_save(type, pronote, fields) {
  switch (type) {
    case 'identity':
      return identity(pronote, fields);
    default:
      return false;
  }
}

module.exports = cozy_save;