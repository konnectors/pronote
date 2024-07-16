const { cozyClient, manifest } = require('cozy-konnector-libs')

const stack_log = require('../../utils/development/stack_log')
const { DOCTYPE_HOMEWORK } = require('../../constants')

async function find_elements(pronote, fields, options) {
  const existingHws = await cozyClient.data.findAll(DOCTYPE_HOMEWORK)
  if (existingHws.length === 0) {
    throw 'No homework found'
  }
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      await find_elements(pronote, fields, options)

      stack_log('✅ All tests passed for test_homeworks')
      resolve(true)
    } catch (error) {
      stack_log('🚨 Error in test_homeworks: ' + error)
      resolve(false)
    }
  })
}

module.exports = init