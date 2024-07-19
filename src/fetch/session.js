// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId,
  getPronoteInstanceInformation,
  defaultPawnoteFetcher
} = require('pawnote')
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')
const { Toutatice, isInstanceToutatice } = require('./toutatice')

// creates a Pawnote session using the provided credentials
async function Pronote({ url, login, password }) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      // Get data from infoMobileApp.json (contains info about the instance including ENT redirection)
      const info = await getPronoteInstanceInformation(defaultPawnoteFetcher, {
        pronoteURL: url
      })

      // Get the URL of the instance (with a trailing slash to add the mobile.eleve.html endpoint)
      const pronoteURL = info.pronoteRootURL + '/'

      // Asks instance information to Pawnote to check if it's a Toutatice instance
      const isToutatice = await isInstanceToutatice(info)

      if (isToutatice) {
        // use Toutatice function to authenticate using retrived tokens
        resolve(Toutatice({ url: pronoteURL, login, password }))
      }

      // creates a Pawnote session using the provided credentials
      const pronote = await authenticatePronoteCredentials(pronoteURL, {
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
