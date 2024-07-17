// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId
} = require('pawnote')

// Fonction qui génère un UUID
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')

// Renvoie une session Pronote
async function Pronote({ url, login, password }) {
  return new Promise((resolve, reject) => async () => {
    try {
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

module.exports = {
  Pronote
}
