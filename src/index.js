// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log } = require('cozy-konnector-libs')
const pronote = require('pronote-api-maintained')

module.exports = new BaseKonnector(start)

// Fonction start qui va être exportée
async function start(fields) {
  const { pronote_url: url, login: username, password } = fields
  const session = await pronote.login(url, username, password, 'toutatice')

  const qr = await pronote.request(session, 'JetonAppliMobile', {
    donnees: {
      code: '1234'
    },
    _Signature_: {
      onglet: 7
    }
  })

  console.log('QR code:', qr)
}
