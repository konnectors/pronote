const { cozyClient } = require('cozy-konnector-libs')

const { DOCTYPE_HOMEWORK } = require('../../constants')

async function find_elements() {
  const existingHws = await cozyClient.data.findAll(DOCTYPE_HOMEWORK)
  if (existingHws.length === 0) {
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
