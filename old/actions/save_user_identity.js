const { saveIdentity, log } = require('cozy-konnector-libs');
const { genUUID } = require('../utils');

async function generate_identity(pronote, fields) {
  return new Promise(async (resolve, reject) => {
    const information = await pronote.getPersonalInformation();

    const identity =
    {
      // _id: genUUID(),
      source: 'connector',
      identifier: fields.login,
      contact: {
        fullname: pronote.studentName && pronote.studentName,
        name: pronote.studentName && {
          // a modifier pour les noms composés
          familyName: pronote.studentName[pronote.studentName.length - 1],
          givenName: pronote.studentName[0]
        },
        email: information.email && [
          {
            adress: information.email
          }
        ],
        phone: information.phone && [
          {
            number: information.phone
          }
        ],
      },
      student: {
        ine: information.INE,
        class: pronote.studentClass,
        school: pronote.schoolName,
      }
    }

    resolve(identity);
  });
}

async function save_user_identity(pronote, fields) {
  const identity = await generate_identity(pronote, fields);
  await saveIdentity(identity, fields.login)
}

module.exports = {
  save_user_identity
}