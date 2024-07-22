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
    const isToutatice = await isInstanceToutatice(info)

    if (isToutatice) {
      // use Toutatice function to authenticate using retrived tokens
      return Toutatice({ url: pronoteURL, login, password })
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
