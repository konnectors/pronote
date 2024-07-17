const TESTS_ENABLED = false

const identity = require('./pronote/identity')
const timetable = require('./pronote/timetable')
const homeworks = require('./pronote/homeworks')
const grades = require('./pronote/grades')
const presence = require('./pronote/presence')

const test_timetable = require('./tests/test_timetable')
const test_homeworks = require('./tests/test_homeworks')
const test_grades = require('./tests/test_grades')
const test_presence = require('./tests/test_presence')
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

async function cozy_test(type, pronote, fields, options = {}) {
  try {
    if (!TESTS_ENABLED) {
      return true
    }

    log('info', '🤔 Testing ' + type)

    switch (type) {
      case 'timetable':
        return test_timetable(pronote, fields, options)
      case 'homeworks':
        return test_homeworks(pronote, fields, options)
      case 'grades':
        return test_grades(pronote, fields, options)
      case 'presence':
        return test_presence(pronote, fields, options)
      default:
        return false
    }
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = {
  cozy_save,
  cozy_test
}
