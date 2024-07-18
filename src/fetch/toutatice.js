const {
  authenticatePronoteQRCode,
  getPronoteInstanceInformation,
  defaultPawnoteFetcher
} = require('pawnote')
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')
const pronoteAPI = require('pronote-api-maintained')

async function Toutatice({ url, login, password }) {
  // uses pronote-api (deprecated) to login to the instance
  // pronote-api contains function to log into ENT using their SSO credentials, exposing an ENT-specific Pronote session, but the API is too old to be used as an entrypoint for data
  const session = await pronoteAPI.login(url, login, password, 'toutatice')

  // Sends to PRONOTE the API request to geenerate a mobile app token
  // The mobile app token allows to create a mobile app authentification code that can regenerate a new session
  const QRData = await pronoteAPI.request(session, 'JetonAppliMobile', {
    donnees: {
      // We're using a random 4-digit code as a PIN code, it's used to sign the QR code data (handled by Pawnote)
      code: Math.floor(1000 + Math.random() * 9000)
    },
    _Signature_: {
      onglet: 7
    }
  })

  // retreives the QR code data and the PIN code (sent back in response)
  const QRInfo = {
    // PRONOTE ultra high security sends back the ultra secret pin code (in plain text) in the response
    pinCode: QRData.RapportSaisie.code,
    dataFromQRCode: {
      // these tokens doesn't allow to log in but just allows us to generate final login tokens
      jeton: QRData.donnees.jeton,
      login: QRData.donnees.login,
      // adding mobile app URL to log in to mobile API
      url: url + 'mobile.eleve.html'
    },
    // generates a random UUID for the device
    deviceUUID: uuid()
  }

  try {
    // Pawnote handles decryption of the QR code data and generates the final login tokens
    const pronote = await authenticatePronoteQRCode(QRInfo)

    log(
      'info',
      `Pronote session created [${pronote.username} : ${pronote.studentName}]`
    )

    return pronote
  } catch (error) {
    throw new Error('LOGIN_FAILED')
  }
}

async function isInstanceToutatice(url) {
  // Get data from infoMobileApp.json (contains info about the instance including ENT redirection)
  const info = await getPronoteInstanceInformation(defaultPawnoteFetcher, {
    pronoteURL: url
  })

  // Check if the instance is Toutatice (by checking the redirection URL)
  if (info.entURL.includes('toutatice.fr')) {
    return true
  } else {
    return false
  }
}

module.exports = {
  Toutatice,
  isInstanceToutatice
}
