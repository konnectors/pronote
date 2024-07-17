const { updateOrCreate, log } = require('cozy-konnector-libs')

const {
  DOCTYPE_TIMETABLE_LESSON,
  PATH_TIMETABLE_RESOURCE
} = require('../../constants')

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const remove_html = require('../../utils/format/remove_html')
const { create_dates } = require('../../utils/misc/create_dates')
const save_resources = require('../../utils/stack/save_resources')
const { queryLessonsByDate } = require('../../queries')

async function get_timetable(pronote, fields, options) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    const dates = create_dates(options)
    const overview = await pronote.getTimetableOverviewForInterval(
      dates.from,
      dates.to
    )

    const timetable = overview.parse({
      withSuperposedCanceledClasses: false,
      withCanceledClasses: true,
      withPlannedClasses: true
    })

    resolve(timetable)
  })
}

async function create_timetable(pronote, fields, options) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    const timetable = await get_timetable(pronote, fields, options)
    const data = []

    let shouldSaveFiles = options['saveFiles']
    if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
      shouldSaveFiles = true
    }

    log(
      'info',
      `[Timetable] : 💾 Saving ${shouldSaveFiles ? 'enabled' : 'disabled'}`
    )

    let shouldGetContent = options['getLessonContent']
    if (shouldGetContent === undefined || shouldGetContent === null) {
      shouldGetContent = true
    }

    log(
      'info',
      `[Timetable] : 📕 Content ${shouldGetContent ? 'saved' : 'ignored'}`
    )

    for (const lesson of timetable) {
      const pronoteString = findObjectByPronoteString(lesson.subject?.name)
      const processedCoursName = pronoteString.label
      const prettyCoursName = pronoteString.pretty

      let relationships = []
      let content = null

      try {
        if (typeof lesson.getResource === 'function' && shouldGetContent) {
          const resource = await lesson.getResource()
          content = resource && resource.contents && resource.contents[0]

          if (resource && shouldSaveFiles) {
            relationships = await save_resources(
              resource,
              PATH_TIMETABLE_RESOURCE,
              lesson.startDate,
              prettyCoursName,
              fields
            )
          }
        }
      } catch (error) {
        log('error', `[Timetable] : 📕 Content error ${error}`)
      }

      const dates = {
        start: new Date(lesson.startDate).toISOString(),
        end: new Date(lesson.endDate).toISOString()
      }

      const status = lesson.canceled
        ? 'CANCELLED'
        : lesson.exempted
        ? 'EXEMPTED'
        : lesson.test
        ? 'TEST'
        : 'CONFIRMED'

      let json = {
        start: dates.start,
        end: dates.end,
        label: prettyCoursName,
        subject: processedCoursName,
        sourceSubject: lesson.subject?.name || 'Cours',
        location: lesson.classrooms.join(', '),
        organizer:
          lesson.teacherNames.join(', ') + lesson.personalNames.join(', '),
        attendee: lesson.groupNames,
        status: status,
        description: lesson.memo,
        xComment: lesson.status,
        xContentLabel: content && content?.title,
        xContentDescription: content && remove_html(content?.description),
        relationships:
          relationships.length > 0
            ? {
                content: {
                  data: relationships
                }
              }
            : null
      }

      data.push(preprocessDoctype(json))
    }

    resolve(data)
  })
}

async function init(pronote, fields, options) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const files = await create_timetable(pronote, fields, options)

      /*
      [Strategy] : don't update past lessons, only update future lessons
      */

      const existing = await queryLessonsByDate(
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
          if (new Date(item.start) > new Date()) {
            if (!updatedRecently) {
              return false
            }
          }

          return item.label === file.label && item.start === file.start
        })

        return !found
      })

      log(
        'info',
        `${filtered.length} new events to save out of ${files.length}`
      )

      const res = await updateOrCreate(
        filtered,
        DOCTYPE_TIMETABLE_LESSON,
        ['start', 'label'],
        {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login
        }
      )

      resolve(res)
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = init
