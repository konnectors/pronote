const {
  addData,
  saveFiles,
  cozyClient,
  updateOrCreate
} = require('cozy-konnector-libs')

const { Q } = require('cozy-client');

const doctypes = require('../../consts/doctypes.json');
const subPaths = require('../../consts/sub_paths.json');

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const remove_html = require('../../utils/format/remove_html')
const { create_dates, getIcalDate } = require('../../utils/misc/create_dates')
const save_resources = require('../../utils/stack/save_resources')

function get_homeworks(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const dates = create_dates(options)
    const overview = await pronote.getHomeworkForInterval(dates.from, dates.to)

    resolve(overview)
  })
}

function create_homeworks(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const homeworks = await get_homeworks(pronote, fields, options)
    const data = []

    let shouldSaveFiles = options['saveFiles']
    if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
      shouldSaveFiles = true
    }
    console.log('shouldSaveFiles', shouldSaveFiles)

    for (const homework of homeworks) {
      const pronoteString = findObjectByPronoteString(homework.subject?.name)
      const processedCoursName = pronoteString.label
      const prettyCoursName = pronoteString.pretty

      const resource = await homework.getResource()
      let relationships = []
      let returned = []

      if (shouldSaveFiles) {
        if (resource) {
          relationships = await save_resources(
            resource,
            subPaths['homeworks']['files'],
            homework.deadline,
            prettyCoursName,
            fields
          )
        }

        if (
          homework.return &&
          homework.return.uploaded &&
          homework.return.uploaded.url
        ) {
          const filesToDownload = []

          const date = new Date(homework.deadline)
          const prettyDate = date.toLocaleDateString('fr-FR', {
            month: 'short',
            day: '2-digit',
            weekday: 'short'
          })

          const extension = homework.return.uploaded.name.split('.').pop()
          let fileName =
            homework.return.uploaded.name.replace(/\.[^/.]+$/, '') +
              ` (${prettyDate})` || 'Rendu devoir du ' + prettyDate

          const exists = await cozyClient.new.queryAll(
            Q('io.cozy.files')
              .where({
                name: `${fileName}.${extension}`
              })
          )

          if (exists.length > 0) {
            // don't download the file if it already exists
          }

          filesToDownload.push({
            filename: `${fileName}.${extension}`,
            fileurl: homework.return.uploaded.url,
            shouldReplaceFile: false,
            subPath: subPaths['homeworks']['returned'].replace(
              '{subject}',
              prettyCoursName
            ),
            fileAttributes: {
              created_at: date,
              updated_at: date
            }
          })

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
                  data: {
                    _id: file['fileDocument']['_id'],
                    _type: 'io.cozy.files'
                  }
                }
              })
            }
          }
        }
      }

      let json = {
        dueDate: getIcalDate(homework.deadline),
        label: prettyCoursName,
        subject: processedCoursName,
        sourceSubject: homework.subject?.name || 'Cours',
        completed: homework.done,
        summary: remove_html(homework.description),
        relationships:
          relationships.length > 0
            ? {
                files: {
                  data: relationships
                },
                returned: {
                  data: returned
                }
              }
            : null
      }

      data.push(preprocessDoctype(json))
    }

    resolve(data)
  })
}

async function init(pronote, fields, options, existing) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_homeworks(pronote, fields, options)
      
      /*
      [Strategy] : don't update past homeworks, only update future homeworks
      */

      // remove duplicates in files
      const filtered = files.filter((file) => {
        const found = existing.find((item) => {
          // if item.cozyMetadata.updatedAt is less than today
          const updated = new Date(item.cozyMetadata.updatedAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const updatedRecently = updated.getTime() > today.getTime();

          // if item is more recent than today
          if (new Date(item.dueDate) > new Date()) {
            if (!updatedRecently) {
              return false;
            }
          }

          return item.label === file.label && item.start === file.start;
        });

        return !found;
      });

      // for existing files, add their _id and _rev
      for (const file of filtered) {
        const found = existing.find((item) => {
          return item.label === file.label && item.start === file.start;
        });

        if (found) {
          file._id = found._id;
          file._rev = found._rev;
        }
      }

      console.log(filtered.length, 'new homeworks to save out of', files.length);

      const res = await updateOrCreate(
        filtered,
        doctypes['homeworks']['homework'],
        ['start', 'label'],
        {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login,
        }
      );

      resolve(res);
    }
    catch (error) {
      reject(error)
    }
  })
}

async function dispatcher(pronote, fields, options) {
  const dates = create_dates(options)

  const existing = await cozyClient.new.queryAll(
    Q(doctypes['homeworks']['homework'])
      .where({
        "dueDate": {
          "$gte": new Date(options.dateFrom).toISOString(),
          "$lt": new Date(options.dateTo).toISOString()
        },
        "cozyMetadata.sourceAccountIdentifier": fields.login
      })
  )

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const data = []
  let from = new Date(dates.from)
  let to = new Date(dates.to)

  // from should be the latest monday
  from.setDate(from.getDate() - from.getDay() + 1);

  while (from < to) {
    let newTo = new Date(from);
    newTo.setDate(newTo.getDate() + 7);

    if (newTo > to) {
      newTo = to
    }

    const res = await init(pronote, fields, {
      ...options,
      dateFrom: from,
      dateTo: newTo
    }, existing);

    data.push(res)
    from = new Date(newTo)
    from.setDate(from.getDate() + 1)

    await delay(options.delay || 1000)
  }

  return data
}

module.exports = dispatcher
