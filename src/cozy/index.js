const identity = require('./pronote/identity')
const timetable = require('./pronote/timetable')
const homeworks = require('./pronote/homeworks')
const grades = require('./pronote/grades')
// const presence = require('./pronote/presence')
const { log } = require('cozy-konnector-libs')

const handlers = {
  identity,
  timetable,
  homeworks,
  grades
  // presence
}

async function cozy_save(type, session, fields, options = {}) {
  try {
    log('info', `🔁 Saving ${type}`)

    const handler = handlers[type]
    if (handler) {
      return handler(session, fields, options)
    }

    return false
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = {
  cozy_save
}
