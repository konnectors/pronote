const { BaseKonnector, saveFiles, request, log } = require('cozy-konnector-libs')
const { fi } = require('date-fns/locale')
const { authenticatePronoteCredentials, PronoteApiAccountId } = require('pawnote');

const rq = request()

module.exports = new BaseKonnector(start)

async function start(fields, cozyParameters) {
  // Login to Pronote (using Pawnote)
  log('info', 'Authenticating ...')
  const pronote = await authenticatePronoteCredentials(fields.pronote_url, {
    accountTypeID: PronoteApiAccountId.Student,
    username: fields.login,
    password: fields.password,
    deviceUUID: "cozy-konnector-pronote"
  });

  // We're logged in !
  log('info', 'Successfully logged in');

  // Getting personal information
  const information = await pronote.getPersonalInformation();
  log('info', "Pronote account is " + pronote.studentName);

  // Saving as a bill
  const documents = [
    {
      date: new Date(),
      vendor: 'Pronote',
      filename: 'pronote-profile-picture.jpg',
      fileurl: pronote.studentProfilePictureURL,
    },
    {
      date: new Date(),
      vendor: 'Pronote',
      filename: 'pronote-student-information.txt',
      filestream: `
        🤖 User : ${pronote.studentName}
        📚 Class : ${information.studentClass || 'N/A'}
        🏫 School : ${information.schoolName || 'N/A'}
        ------------------
        📞 Phone : ${information.phone || 'N/A'}
        📧 Email : ${information.email || 'N/A'}
        🏠 Address : ${information.address[0] ? information.address[0].join(' ') : 'N/A'}
        ------------------
        🎓 INE : ${information.ine || 'N/A'}
      `
    }
  ]

  log('info', 'Saving data to Cozy')
  await saveFiles(documents, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login
  })
}