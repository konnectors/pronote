const { authenticatePronoteCredentials, PronoteApiAccountId } = require('pawnote');

async function login_Pronote(fields) {
  return new Promise(async (resolve, reject) => {
    try {
      const pronote = await authenticatePronoteCredentials(fields.pronote_url, {
        accountTypeID: PronoteApiAccountId.Student,
        username: fields.login,
        password: fields.password,
        deviceUUID: "cozy-konnector-pronote"
      });

      resolve(pronote);
    } catch (error) {
      throw new Error(error);
    }
  });
}

module.exports = {
  login_Pronote
}