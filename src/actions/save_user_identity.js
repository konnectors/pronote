const { saveIdentity } = require('cozy-konnector-libs');

async function generate_identity(pronote, fields) {
  return new Promise(async (resolve, reject) => {
    const information = await pronote.getPersonalInformation();

    const identity =
    {
      contact: {
        name: pronote.studentName,
        identifier: fields.login,
        contact: {
          email: information.email,
          phone: information.phone
        },
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