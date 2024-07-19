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
  const dates = create_dates(options)

  const overview = await pronote.getTimetableOverviewForInterval(
    dates.from,
    dates.to
  )

  return overview.parse({
    withSuperposedCanceledClasses: false,
    withCanceledClasses: true,
    withPlannedClasses: true
  })
}

async function create_timetable(pronote, fields, options) {
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

  return data
}

async function init(pronote, fields, options) {
  try {
    const files = await create_timetable(pronote, fields, options)

    /*
      [Strategy] : don't update past lessons, only update future lessons
                   + don't update lessons that have been updated today
           Why ? : past lessons never update, only future ones can be edited / cancelled
    */

    // query all lessons from dateFrom to dateTo
    const existing = await queryLessonsByDate(
      fields,
      options.dateFrom,
      options.dateTo
    )

    // filtered contains only events to update
    const filtered = files.filter(file => {
      // found returns true if the event is already in the database and doesn't need to be updated
      const found = existing.find(item => {
        // get the last update date
        const updated = new Date(item.cozyMetadata.updatedAt)

        // get today's date
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // has the item been updated today ?
        const updatedRecently = updated.getTime() > today.getTime()

        // if the lesson is in the future, it can be updated
        if (new Date(item.start) > new Date()) {
          // only update if the lesson has not been updated
          if (!updatedRecently) {
            // needs an update since it's in the future and hasn't been updated today
            return false
          }
        }

        // else, match the label and start date to know if the event is already in the database
        return item.label === file.label && item.start === file.start
      })

      // only return files that are not found or that needs an update (returned false)
      return !found
    })

    log('info', `${filtered.length} new events to save out of ${files.length}`)

    const res = await updateOrCreate(
      filtered,
      DOCTYPE_TIMETABLE_LESSON,
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
