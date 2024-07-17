const { cozyClient, manifest } = require('cozy-konnector-libs')

const stack_log = require('../../utils/development/stack_log')
const { DOCTYPE_TIMETABLE_LESSON } = require('../../constants')

async function find_elements(pronote, fields, options) {
  const existingLessons = await cozyClient.data.findAll(
    DOCTYPE_TIMETABLE_LESSON
  )
  if (existingLessons.length === 0) {
    throw 'No lessons found'
  }
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      await find_elements(pronote, fields, options)

      stack_log('✅ All tests passed for test_timetable')
      resolve(true)
    } catch (error) {
      stack_log('🚨 Error in test_timetable: ' + error)
      resolve(false)
    }
  })
}

module.exports = init
