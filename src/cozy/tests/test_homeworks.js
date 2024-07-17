const { cozyClient } = require('cozy-konnector-libs')

const { DOCTYPE_HOMEWORK } = require('../../constants')

async function find_elements() {
  const existingHws = await cozyClient.data.findAll(DOCTYPE_HOMEWORK)
  if (existingHws.length === 0) {
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
