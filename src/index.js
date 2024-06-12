const { BaseKonnector, saveFiles, saveIdentity, saveAccountData, request, log } = require('cozy-konnector-libs')

const {
  login_Pronote
} = require('./pronote');
const { save_user_metadata } = require('./actions/save_user_metadata');
const { save_user_identity } = require('./actions/save_user_identity');

const rq = request()

module.exports = new BaseKonnector(start)

async function start(fields, cozyParameters) {
  // Login to Pronote (using Pawnote)
  log('info', 'Authenticating ...')
  const pronote = await login_Pronote(fields);
  log('info', 'Successfully logged in');

  // Saving identity
  log('info', 'Saving identity to Cozy')
  save_user_identity(pronote, fields);

  // Saving data
  log('info', 'Saving data to Cozy')
  save_user_metadata(pronote, fields);
}