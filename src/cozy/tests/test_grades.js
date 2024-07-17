const { cozyClient } = require('cozy-konnector-libs')
const { DOCTYPE_GRADE } = require('../../constants')

async function find_elements() {
  const existingElm = await cozyClient.data.findAll(DOCTYPE_GRADE)
  if (existingElm.length === 0) {
    throw 'No homework found'
  }
}

async function init(pronote, fields, options) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    try {
      await find_elements(pronote, fields, options)
      resolve(true)
    } catch (error) {
      resolve(false)
    }
  })
}

module.exports = init
