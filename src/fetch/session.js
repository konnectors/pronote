// Librairie Pawnote
const {
  authenticatePronoteCredentials,
  PronoteApiAccountId
} = require('pawnote');

// Importation de la fonction de log
const { log } = require('cozy-konnector-libs')

// Fonction qui génère un UUID
const uuid = require('../utils/uuid');

// Renvoie une session Pronote
async function Pronote({
  url,
  login,
  password
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const pronote = await authenticatePronoteCredentials(url, {
        accountTypeID: PronoteApiAccountId.Student,
        username: login,
        password: password,
        deviceUUID: uuid()
      });

      log('info', 'Pronote session created [' + pronote.username + ' : ' + pronote.studentName + ']');

      resolve(pronote);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  Pronote
}