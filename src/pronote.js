const { authenticatePronoteCredentials, PronoteApiAccountId } = require('pawnote');

async function login_Pronote(fields) {
  return authenticatePronoteCredentials(fields.pronote_url, {
    accountTypeID: PronoteApiAccountId.Student,
    username: fields.login,
    password: fields.password,
    deviceUUID: "cozy-konnector-pronote"
  });
}

module.exports = {
  login_Pronote
}