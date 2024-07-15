const { saveFiles } = require('cozy-konnector-libs')

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const stack_log = require('../../utils/development/stack_log')
const remove_html = require('../../utils/format/remove_html')
const use_stream = require('../../utils/misc/use_stream')
const { create_dates, getIcalDate } = require('../../utils/misc/create_dates')

const save_resources = (
  resource,
  subPath,
  startDate,
  prettyCoursName,
  fields
) => {
  return new Promise(async (resolve, reject) => {
    const filesToDownload = []
    const relationships = []

    for (const resourceContent of resource.contents) {
      const date = new Date(startDate)
      const prettyDate = date.toLocaleDateString('fr-FR', {
        month: 'short',
        day: '2-digit',
        weekday: 'short'
      })

      let path = subPath
      path = path.replace('{subject}', prettyCoursName)

      for (const file of resourceContent.files) {
        if (file.type == 1) {
          // Downloadable file
          const extension = file.name.split('.').pop()
          let fileName = file.name.replace(/\.[^/.]+$/, '')

          filesToDownload.push({
            filename: `${fileName} (${prettyDate}).${extension}`,
            fileurl: file.url,
            shouldReplaceFile: false,
            subPath: path,
            fileAttributes: {
              created_at: date,
              updated_at: date
            }
          })
        } else if (file.type == 0) {
          // URL
          const fileData = `[InternetShortcut]
URL=${file.url}`.trim()

          const source = await use_stream(
            fileData,
            'application/internet-shortcut'
          )

          const extension = 'url'
          let fileName = file.name

          filesToDownload.push({
            filename: `${fileName} (${prettyDate}).${extension}`,
            filestream: source,
            shouldReplaceFile: false,
            subPath: path,
            fileAttributes: {
              created_at: date,
              updated_at: date
            }
          })
        }
      }
    }

    if (filesToDownload.length > 0) {
      const data = await saveFiles(filesToDownload, fields, {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
        concurrency: 1,
        validateFile: () => true
      })

      for (const file of data) {
        if (file['fileDocument']) {
          relationships.push({
            resource: {
              data: { _id: file['fileDocument']['_id'], _type: 'io.cozy.files' }
            }
          })
        }
      }

      resolve(relationships)
    } else {
      resolve([])
    }
  })
}

module.exports = save_resources
