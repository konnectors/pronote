const {
  addData,
  saveFiles,
} = require('cozy-konnector-libs')

const doctypes = require('../../consts/doctypes.json');
const subPaths = require('../../consts/sub_paths.json');

const findObjectByPronoteString = require('../../utils/format/format_cours_name');
const preprocessDoctype = require('../../utils/format/preprocess_doctype');
const remove_html = require('../../utils/format/remove_html');
const { create_dates, getIcalDate } = require('../../utils/misc/create_dates');
const save_resources = require('../../utils/stack/save_resources');

function get_homeworks(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const dates = create_dates(options);
    const overview = await pronote.getHomeworkForInterval(dates.from, dates.to);

    resolve(overview);
  })
}

function create_homeworks(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const homeworks = await get_homeworks(pronote, fields, options);
    const data = [];

    let shouldSaveFiles = options['saveFiles'];
    if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
      shouldSaveFiles = true;
    }
    console.log('shouldSaveFiles', shouldSaveFiles);

    for (const homework of homeworks) {
      const pronoteString = findObjectByPronoteString(homework.subject?.name);
      const processedCoursName = pronoteString.label;
      const prettyCoursName = pronoteString.pretty;

      const resource = await homework.getResource();
      let relationships = [];
      let returned = [];

      if (shouldSaveFiles) {
        if (resource) {
          relationships = await save_resources(resource, subPaths['homeworks']['files'], homework.deadline, prettyCoursName, fields);
        }

        if (homework.return && homework.return.uploaded && homework.return.uploaded.url) {
          const filesToDownload = [];

          const date = new Date(homework.deadline);
          const prettyDate = date.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit', weekday: 'short' });

          const extension = homework.return.uploaded.name.split('.').pop();
          let fileName = homework.return.uploaded.name.replace(/\.[^/.]+$/, "") + ` (${prettyDate})` || 'Rendu devoir du ' + prettyDate;

          filesToDownload.push({
            filename: `${fileName}.${extension}`,
            fileurl: homework.return.uploaded.url,
            shouldReplaceFile: false,
            subPath: subPaths['homeworks']['returned'].replace('{subject}', prettyCoursName),
            fileAttributes: {
              created_at: date,
              updated_at: date,
            }
          });

          const data = await saveFiles(filesToDownload, fields, {
            sourceAccount: this.accountId,
            sourceAccountIdentifier: fields.login,
            concurrency: 1,
            validateFile: () => true
          })

          for (const file of data) {
            if (file['fileDocument']) {
              returned.push({
                resource: {
                  data: { _id: file['fileDocument']['_id'], _type: 'io.cozy.files' }
                }
              });
            }
          }
        }
      }

      let json = {
        "dueDate": getIcalDate(homework.deadline),
        "label": prettyCoursName,
        "subject": processedCoursName,
        "sourceSubject": homework.subject?.name || 'Cours',
        "completed": homework.done,
        "summary": remove_html(homework.description),
        "relationships": relationships.length > 0 ? {
          "files": {
            "data": relationships
          },
          "returned": {
            "data": returned
          }
        } : null
      }

      data.push(preprocessDoctype(json));
    }

    resolve(data);
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_homeworks(pronote, fields, options);

      const res = await addData(files, doctypes['homeworks']['homework'], {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
      });

      resolve(res);
    }
    catch (error) {
      reject(error);
    }
  });
}

async function dispatcher(pronote, fields, options) {
  const dates = create_dates(options);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const data = [];
  let from = new Date(dates.from);
  let to = new Date(dates.to);

  while (from < to) {
    let newTo = new Date(from);
    newTo.setDate(newTo.getDate() + 3);

    if (newTo > to) {
      newTo = to;
    }

    const res = await init(pronote, fields, {
      ...options,
      dateFrom: from,
      dateTo: newTo
    });

    data.push(res);
    from = new Date(newTo);
    from.setDate(from.getDate() + 1);

    if (res.length > 4) {
      await delay(options.delay || 1000);
    }
  }

  return data;
}

module.exports = dispatcher;