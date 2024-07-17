const { saveFiles } = require('cozy-konnector-libs')
const use_stream = require('../../utils/misc/use_stream')
const { queryFilesByName } = require('../../queries')

const save_resources = (
  resource,
  subPath,
  startDate,
  prettyCoursName,
  fields
) => {
  return new Promise(resolve => async () => {
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

          const exists = await queryFilesByName(
            `${fileName} (${prettyDate}).${extension}`
          )

          if (exists.length > 0) {
            continue
          }

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

          const exists = queryFilesByName(
            `${fileName} (${prettyDate}).${extension}`
          )

          if (exists.length > 0) {
            continue
          }

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
