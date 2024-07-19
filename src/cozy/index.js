const identity = require('./pronote/identity')
const timetable = require('./pronote/timetable')
const homeworks = require('./pronote/homeworks')
const grades = require('./pronote/grades')
const presence = require('./pronote/presence')

const { log } = require('cozy-konnector-libs')

async function cozy_save(type, pronote, fields, options = {}) {
  try {
    log('info', '🔁 Saving ' + type)

    switch (type) {
      case 'identity':
        return identity(pronote, fields, options)
      case 'timetable':
        return timetable(pronote, fields, options)
      case 'homeworks':
        return homeworks(pronote, fields, options)
      case 'grades':
        return grades(pronote, fields, options)
      case 'presence':
        return presence(pronote, fields, options)
      default:
        return false
    }
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = {
  cozy_save
}
