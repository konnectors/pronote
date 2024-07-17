// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId,
  authenticatePronoteQRCode
} = require('pawnote')

const pronoteAPI = require('pronote-api-maintained')

// Fonction qui génère un UUID
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')

// Renvoie une session Pronote
async function Pronote({ url, login, password }) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      if (url.includes('pronote.toutatice.fr')) {
        resolve(Toutatice({ url, login, password }))
      }

      const pronote = await authenticatePronoteCredentials(url, {
        accountTypeID: PronoteApiAccountId.Student,
        username: login,
        password: password,
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

async function Toutatice({ url, login, password }) {
  const session = await pronoteAPI.login(url, login, password, 'toutatice')

  const QRData = await pronoteAPI.request(session, 'JetonAppliMobile', {
    donnees: {
      code: '1234'
    },
    _Signature_: {
      onglet: 7
    }
  })

  const QRInfo = {
    pinCode: QRData.RapportSaisie.code,
    dataFromQRCode: {
      jeton: QRData.donnees.jeton,
      login: QRData.donnees.login,
      url: url + 'mobile.eleve.html'
    },
    deviceUUID: uuid()
  }

  try {
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

module.exports = {
  Pronote
}
