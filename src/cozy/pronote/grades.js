const { saveFiles, updateOrCreate, log } = require('cozy-konnector-libs')

const {
  DOCTYPE_GRADE,
  PATH_GRADE_SUBJECT,
  PATH_GRADE_CORRECTION,
  PATH_GRADE_REPORT
} = require('../../constants')

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const { queryAllGrades } = require('../../queries')

async function get_grades(pronote) {
  const allGrades = []

  // Get all periods (trimesters, semesters, etc.)
  const periods = pronote.periods

  // For each period, get all grades
  for (const period of periods) {
    // Get all grades for each period
    const gradesOverview = await pronote.getGradesOverview(period)

    // For each grade, get the subject and add it to the list
    for (const grade of gradesOverview.grades) {
      // Get the subject of the grade
      const subject = grade.subject

      // Find the subject in the list of all subjects
      const subjectIndex = allGrades.findIndex(
        item => item.subject.name === subject.name && item.period === period
      )

      // If the subject is not yet in the list, add it
      if (subjectIndex === -1) {
        allGrades.push({
          subject: subject,
          period: period,
          averages: {},
          grades: [grade]
        })
      } else {
        allGrades[subjectIndex].grades.push(grade)
      }
    }

    // For each average, get the subject and add it to the list
    for (const average of gradesOverview.averages) {
      // Get the subject of the average
      const subject = average.subject

      // Find the subject in the list of all subjects
      const subjectIndex = allGrades.findIndex(
        item => item.subject.name === subject.name && item.period === period
      )
      if (subjectIndex === -1) {
        allGrades.push({
          subject: subject,
          period: period,
          averages: {},
          grades: []
        })
      } else {
        allGrades[subjectIndex].averages = average
      }
    }
  }

  // Return the list of all grades
  return allGrades
}

async function getReports(pronote) {
  const allReports = []

  // Get all reports
  const reportPeriods = pronote.readPeriodsForGradesReport()
  for (const period of reportPeriods) {
    try {
      const reportURL = await pronote.generateGradesReportPDF(period)
      allReports.push({
        period: period.name,
        url: reportURL
      })
    } catch (error) {
      log('warn', 'Could not fetch report for period:', period.name)
    }
  }

  return allReports
}

async function saveReports(pronote, fields) {
  const reports = await getReports(pronote)
  const filesToDownload = []

  for (const report of reports) {
    const extension = 'pdf'
    let fileName = `Bulletin du ${report.period}`

    filesToDownload.push({
      filename: `${fileName}.${extension}`,
      fileurl: report.url,
      shouldReplaceFile: false,
      subPath: PATH_GRADE_REPORT,
      fileAttributes: {
        created_at: new Date(),
        updated_at: new Date()
      }
    })
  }

  const data = await saveFiles(filesToDownload, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login,
    concurrency: 3,
    qualificationLabel: 'gradebook', // Grade report
    validateFile: () => true
  })

  return data
}

async function createGrades(pronote, fields, options) {
  // Get all grades
  const grades = await get_grades(pronote, fields, options)
  const data = []

  // Get options
  let shouldSaveFiles = options['saveFiles']
  if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
    shouldSaveFiles = true
  }

  log(
    'info',
    `[Grades] : 💾 Saving ${shouldSaveFiles ? 'enabled' : 'disabled'}`
  )

  // For each grade, create a doctype
  for (const grade of grades) {
    const pronoteString = findObjectByPronoteString(grade.subject?.name)
    const processedCoursName = pronoteString.label
    const prettyCoursName = pronoteString.pretty

    let subjectFiles = []
    let correctionFiles = []

    // Files
    const evals = []

    // For each file, save it and add it to the list of files
    for (const evl of grade.grades) {
      const id =
        new Date(evl.date).getTime() +
        '_' +
        processedCoursName +
        '_' +
        (evl.comment
          .replace(/\s+/g, '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '') || 'grd')

      if (evl.subjectFile && evl.subjectFile.url && shouldSaveFiles) {
        const filesToDownload = []

        const date = new Date(evl.date)
        const prettyDate = date.toLocaleDateString('fr-FR', {
          month: 'short',
          day: '2-digit',
          weekday: 'short'
        })

        const extension = evl.subjectFile.name.split('.').pop()
        let fileName =
          evl.subjectFile.name.replace(/\.[^/.]+$/, '') + ` (${prettyDate})` ||
          'Rendu devoir du ' + prettyDate

        filesToDownload.push({
          filename: `${fileName}.${extension}`,
          fileurl: evl.subjectFile.url,
          shouldReplaceFile: false,
          subPath: PATH_GRADE_SUBJECT.replace('{subject}', prettyCoursName),
          fileAttributes: {
            created_at: date,
            updated_at: date
          }
        })

        const data = await saveFiles(filesToDownload, fields, {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login,
          concurrency: 3,
          qualificationLabel: 'other_work_document', // Given subject
          validateFile: () => true
        })

        for (const file of data) {
          if (file['fileDocument']) {
            subjectFiles.push({
              resource: {
                data: {
                  _id: file['fileDocument']['_id'],
                  _type: 'io.cozy.files',
                  metadata: {
                    gradeId: id
                  }
                }
              }
            })
          }
        }
      }

      if (evl.correctionFile && evl.correctionFile.url && shouldSaveFiles) {
        const filesToDownload = []

        const date = new Date(evl.date)
        const prettyDate = date.toLocaleDateString('fr-FR', {
          month: 'short',
          day: '2-digit',
          weekday: 'short'
        })

        const extension = evl.correctionFile.name.split('.').pop()
        let fileName =
          evl.correctionFile.name.replace(/\.[^/.]+$/, '') +
            ` (${prettyDate})` || 'Rendu devoir du ' + prettyDate

        filesToDownload.push({
          filename: `${fileName}.${extension}`,
          fileurl: evl.correctionFile.url,
          shouldReplaceFile: false,
          subPath: PATH_GRADE_CORRECTION.replace('{subject}', prettyCoursName),
          fileAttributes: {
            created_at: date,
            updated_at: date
          }
        })

        const data = await saveFiles(filesToDownload, fields, {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login,
          concurrency: 3,
          qualificationLabel: 'other_work_document', // Corrected subject
          validateFile: () => true
        })

        for (const file of data) {
          if (file['fileDocument']) {
            correctionFiles.push({
              resource: {
                data: {
                  _id: file['fileDocument']['_id'],
                  _type: 'io.cozy.files',
                  metadata: {
                    gradeId: id
                  }
                }
              }
            })
          }
        }
      }

      const njs = {
        id: id,
        label: evl.comment.trim() !== '' ? evl.comment : null,
        date: new Date(evl.date).toISOString(),
        value: {
          student: evl.value,
          outOf: evl.outOf,
          coef: evl.coefficient,
          classAverage: evl.average,
          classMax: evl.max,
          classMin: evl.min
        },
        status: {
          isBonus: evl.isBonus,
          isOptional: evl.isOptional
        }
      }

      evals.push(njs)
    }

    let avgGrades
    if (evals.length === 1) {
      // When there is only one eval, pronote does not give the student average
      const scaleMult = 20 / evals[0].value.outOf // Necessary to normalise grades not on /20
      avgGrades = evals[0].value.student * scaleMult
    } else {
      avgGrades = grade.averages.student
    }

    // Create the doctype
    const json = {
      subject: processedCoursName,
      sourceSubject: grade.subject?.name || 'Cours',
      title: grade.period.name,
      startDate: new Date(grade.period.start).toISOString(),
      endDate: new Date(grade.period.end).toISOString(),
      aggregation: {
        avgGrades: avgGrades,
        avgClass: grade.averages.class_average,
        maxClass: grade.averages.max,
        minClass: grade.averages.min
      },
      series: evals,
      relationships:
        subjectFiles.length > 0 || correctionFiles.length > 0
          ? {
              files: {
                data: subjectFiles
              },
              corrections: {
                data: correctionFiles
              }
            }
          : null
    }

    data.push(preprocessDoctype(json))
  }

  return data
}

async function init(pronote, fields, options) {
  try {
    let files = await createGrades(pronote, fields, options)

    /*
    [Strategy] : don't update grades, they stay the same
    */

    const existing = await queryAllGrades()

    // remove duplicates in files
    const filtered = files.filter(file => {
      const found = existing.find(item => {
        return (
          item.series.length === file.series.length &&
          item.startDate === file.startDate &&
          item.subject === file.subject
        )
      })

      return !found
    })

    const res = await updateOrCreate(
      filtered,
      DOCTYPE_GRADE,
      ['startDate', 'subject'],
      {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login
      }
    )

    await saveReports(pronote, fields, options)

    return res
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = init
