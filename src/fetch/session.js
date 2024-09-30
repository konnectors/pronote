// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId,
  getPronoteInstanceInformation,
  defaultPawnoteFetcher
} = require('pawnote')
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')
const { ENTPronoteLogin, getCasName } = require('./ENT')

// creates a Pawnote session using the provided credentials
async function Pronote({ url, login, password }) {
  try {
    // Remove everything after /pronote/ in the URL
    const newURL = url.split('/pronote')[0] + '/pronote/'

    // Get data from infoMobileApp.json (contains info about the instance including ENT redirection)
    const info = await getPronoteInstanceInformation(defaultPawnoteFetcher, {
      pronoteURL: newURL
    })

    // Get the URL of the instance (with a trailing slash to add the mobile.eleve.html endpoint)
    const pronoteURL = info.pronoteRootURL + '/'

    // Asks instance information to Pawnote to check if it's a Toutatice instance
    const casName = await getCasName(info)
    if (casName) {
      log('debug', `Found a CAS name : ${casName}`)
    }

    // Check if the URL uses the login=true parameter (bypasses ENT redirection)
    const usesLoginTrue = url.includes('login=true')

    if (casName && !usesLoginTrue) {
      // use ENT function to authenticate using retrived tokens
      return ENTPronoteLogin({ url: pronoteURL, login, password, casName })
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

    return pronote
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = {
  Pronote
}
