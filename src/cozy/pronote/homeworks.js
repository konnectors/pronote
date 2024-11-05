const { saveFiles, updateOrCreate, log } = require('cozy-konnector-libs')
const { resourcesFromIntervals } = require('pawnote')

const {
  DOCTYPE_HOMEWORK,
  PATH_HOMEWORK_RETURNED,
  PATH_HOMEWORK_FILE
} = require('../../constants')

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const remove_html = require('../../utils/format/remove_html')
const { createDates, getIcalDate } = require('../../utils/misc/createDates')
const save_resources = require('../../utils/stack/save_resources')
const { queryFilesByName, queryHomeworksByDate } = require('../../queries')

async function get_homeworks(session, fields, options) {
  const dates = createDates(options)
  const overview = await resourcesFromIntervals(session, dates.from, dates.to)

  return {
    homeworks: overview
  }
}

async function createHomeworks(session, fields, options) {
  const interval = await get_homeworks(session, fields, options)
  const homeworks = interval.homeworks

  const data = []

  let shouldSaveFiles = options['saveFiles']
  if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
    shouldSaveFiles = true
  }

  log(
    'info',
    `[Homeworks] : 💾 Saving ${shouldSaveFiles ? 'enabled' : 'disabled'}`
  )

  for (const homework of homeworks) {
    const pronoteString = findObjectByPronoteString(homework.subject?.name)
    const processedCoursName = pronoteString.label
    const prettyCoursName = pronoteString.pretty

    let relationships = []
    let returned = []

    if (shouldSaveFiles) {
      if (homework.attachments && homework.attachments.length > 0) {
        relationships = await save_resources(
          homework.attachments,
          PATH_HOMEWORK_FILE,
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

        const exists = await queryFilesByName(`${fileName}.${extension}`)

        if (exists.length > 0) {
          // don't download the file if it already exists
        }

        filesToDownload.push({
          filename: `${fileName}.${extension}`,
          fileurl: homework.return.uploaded.url,
          shouldReplaceFile: false,
          subPath: PATH_HOMEWORK_RETURNED.replace('{subject}', prettyCoursName),
          fileAttributes: {
            created_at: date,
            updated_at: date
          }
        })

        const data = await saveFiles(filesToDownload, fields, {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login,
          concurrency: 3,
          qualificationLabel: 'other_work_document', // Homework subject
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

  return data
}

async function init(session, fields, options) {
  try {
    let files = await createHomeworks(session, fields, options)

    /*
      [Strategy] : don't update past homeworks, only update future homeworks
    */

    // get existing homeworks
    const existing = await queryHomeworksByDate(
      fields,
      options.dateFrom,
      options.dateTo
    )

    // remove duplicates in files
    const filtered = files.filter(file => {
      const found = existing.find(item => {
        // if item.cozyMetadata.updatedAt is less than today
        const updated = new Date(item.cozyMetadata.updatedAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const updatedRecently = updated.getTime() > today.getTime()

        // if item is more recent than today
        if (new Date(item.dueDate) > new Date()) {
          if (!updatedRecently) {
            return false
          }
        }

        return item.label === file.label && item.start === file.start
      })

      return !found
    })

    // for existing files, add their _id and _rev
    for (const file of filtered) {
      const found = existing.find(item => {
        return item.label === file.label && item.start === file.start
      })

      if (found) {
        file._id = found._id
        file._rev = found._rev
      }
    }

    log(
      'info',
      `${filtered.length} new homeworks to save out of ${files.length}`
    )

    const res = await updateOrCreate(
      filtered,
      DOCTYPE_HOMEWORK,
      ['start', 'label'],
      {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login
      }
    )

    return res
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = init
