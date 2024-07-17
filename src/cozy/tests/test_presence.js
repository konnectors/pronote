const { cozyClient } = require('cozy-konnector-libs')
const { DOCTYPE_ATTENDANCE } = require('../../constants')

async function find_elements() {
  const existingElm = await cozyClient.data.findAll(DOCTYPE_ATTENDANCE)
  if (existingElm.length === 0) {
    throw 'No homework found'
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
