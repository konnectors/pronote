const { saveFiles, log } = require('cozy-konnector-libs');
const { use_stream, create_file } = require('../utils');

const SUBPATH = 'Notes';

async function save_averages(pronote, fields) {
  const period = await pronote.readDefaultPeriodForGradesOverview();
  const gradesOverview = await pronote.getGradesOverview(period);

  let res = ``;

  gradesOverview.averages.forEach((average) => {
    res += `
    ---[ ${average.subject.name} ]---
      📊 Average : ${average.student}
      📊 Class average : ${average.class}
      📊 Minimum : ${average.min}
      📊 Maximum : ${average.max}
    `;
  });

  const documents = [
    create_file({
      filename: 'pronote-grades-overview.txt',
      filestream: await use_stream(res),
      subPath: SUBPATH
    })
  ];

  await saveFiles(documents, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login
  });
}

module.exports = {
  save_averages
}