// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId
} = require('pawnote')
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')
const { Toutatice, isInstanceToutatice } = require('./toutatice')

// creates a Pawnote session using the provided credentials
async function Pronote({ url, login, password }) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // Asks instance information to Pawnote to check if it's a Toutatice instance
      const isToutatice = await isInstanceToutatice(url)

      if (isToutatice) {
        // use Toutatice function to authenticate using retrived tokens
        resolve(Toutatice({ url, login, password }))
      }

      // creates a Pawnote session using the provided credentials
      const pronote = await authenticatePronoteCredentials(url, {
        // account type (student by default)
        accountTypeID: PronoteApiAccountId.Student,
        // provided credentials
        username: login,
        password: password,
        // generate a random UUID for the device
        deviceUUID: uuid()
      })

      log(
        'info',
        `Pronote session created [${pronote.username} : ${pronote.studentName}]`
      )

      resolve(pronote)
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  Pronote
}
