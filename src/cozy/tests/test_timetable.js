const { cozyClient } = require('cozy-konnector-libs')
const { DOCTYPE_TIMETABLE_LESSON } = require('../../constants')

async function find_elements() {
  const existingLessons = await cozyClient.data.findAll(
    DOCTYPE_TIMETABLE_LESSON
  )
  if (existingLessons.length === 0) {
    throw 'No lessons found'
  }
}

async function init(pronote, fields, options) {
  return new Promise(resolve => async () => {
    try {
      await find_elements(pronote, fields, options)
      resolve(true)
    } catch (error) {
      resolve(false)
    }
  })
}

module.exports = init
