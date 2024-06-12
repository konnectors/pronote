const { saveFiles, log } = require('cozy-konnector-libs');
const { use_stream, create_file } = require('../utils');

async function parse_user_data(type, pronote, information) {
  return new Promise((resolve, reject) => {
    if (type == 'csv') {
      let csv = `
      date, user, class, school, phone, email, address, INE
      ${new Date().toUTCString()}, ${pronote.studentName}, ${pronote.studentClass || 'N/A'}, ${pronote.schoolName || 'N/A'}, ${information.phone || 'N/A'}, ${information.email || 'N/A'}, ${information.address[0] ? information.address[0].join(' ') : 'N/A'}, ${information.INE || 'N/A'}
      `.trim();

      // resolve with a csv file stream
      const stream = use_stream(csv);
      resolve(stream);
    }
    if (type == 'json') {
      const json = {
        date: new Date(),
        user: pronote.studentName,
        class: pronote.studentClass || 'N/A',
        school: pronote.schoolName || 'N/A',
        phone: information.phone || 'N/A',
        email: information.email || 'N/A',
        address: information.address[0] ? information.address[0].join(' ') : 'N/A',
        INE: information.INE || 'N/A'
      }

      // resolve with a json file stream
      const stream = use_stream(JSON.stringify(json));
      resolve(stream);
    }
    else {
      resolve(`
            📆 Date : ${new Date().toUTCString()}
            ------------------
            🤖 User : ${pronote.studentName}
            📚 Class : ${pronote.studentClass || 'N/A'}
            🏫 School : ${pronote.schoolName || 'N/A'}
            ------------------
            📞 Phone : ${information.phone || 'N/A'}
            📧 Email : ${information.email || 'N/A'}
            🏠 Address : ${information.address[0] ? information.address[0].join(' ') : 'N/A'}
            ------------------
            🎓 INE : ${information.INE || 'N/A'}
          `)
    }
  });
}

async function generate_documents(pronote) {
  return new Promise(async (resolve, reject) => {
    const information = await pronote.getPersonalInformation();

    const documents = [
      create_file({
        filename: 'pronote-profile-picture.jpg',
        fileurl: pronote.studentProfilePictureURL,
        shouldReplaceFile: false,
        subPath: 'pronote-student-information'
      }),
      create_file({
        filename: 'pronote-student-information.txt',
        filestream: await parse_user_data('default', pronote, information),
        subPath: 'pronote-student-information'
      }),
      create_file({
        filename: 'pronote-student-information.csv',
        filestream: await parse_user_data('csv', pronote, information),
        subPath: 'pronote-student-information'
      }),
      create_file({
        filename: 'pronote-student-information.json',
        filestream: await parse_user_data('json', pronote, information),
        subPath: 'pronote-student-information'
      })
    ]

    resolve(documents);
  });
}

async function save_user_metadata(pronote, fields) {
  const documents = await generate_documents(pronote);

  await saveFiles(documents, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login
  });
}

module.exports = {
  save_user_metadata
}