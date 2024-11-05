const { updateOrCreate, log } = require('cozy-konnector-libs')
const { timetableFromIntervals, parseTimetable } = require('pawnote')

const {
  DOCTYPE_TIMETABLE_LESSON,
  PATH_TIMETABLE_RESOURCE
} = require('../../constants')

const findObjectByPronoteString = require('../../utils/format/format_cours_name')
const preprocessDoctype = require('../../utils/format/preprocess_doctype')
const remove_html = require('../../utils/format/remove_html')
const { createDates } = require('../../utils/misc/createDates')
const save_resources = require('../../utils/stack/save_resources')
const { queryLessonsByDate } = require('../../queries')

// Obtains timetable from Pronote
async function get_timetable(session, fields, options) {
  // Generate dates if needed (to get the full week or year)
  const dates = createDates(options)

  // Send request to get timetable
  const timetable = await timetableFromIntervals(session, dates.from, dates.to)

  // Parse timetable response with settings
  parseTimetable(session, timetable, {
    withSuperposedCanceledClasses: false,
    withCanceledClasses: true,
    withPlannedClasses: true
  })
  return timetable
}

// Process timetable and create doctypes
async function createTimetable(session, fields, options) {
  // Get timetable from Pronote
  const timetable = await get_timetable(session, fields, options)
  // Empty array to store doctypes
  const data = []

  // Get options
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

  for (const lesson of timetable.classes) {
    if (lesson.is !== 'lesson') continue
    // Get the formatted Cozy name
    const pronoteString = findObjectByPronoteString(lesson.subject?.name)
    const processedCoursName = pronoteString.label
    const prettyCoursName = pronoteString.pretty

    // Fills relationships with resources
    let relationships = []
    // Content of the lesson if available
    let content = null

    try {
      if (typeof lesson.getResource === 'function' && shouldGetContent) {
        // API call to get the content of the lesson
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

    // Transform the dates to ISO strings
    const dates = {
      start: new Date(lesson.startDate).toISOString(),
      end: new Date(lesson.endDate).toISOString()
    }

    // Status of the lesson (iCal spec)
    const status = lesson.canceled
      ? 'CANCELLED'
      : lesson.exempted
      ? 'EXEMPTED'
      : lesson.test
      ? 'TEST'
      : 'CONFIRMED'

    // Create the document
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

    // Remove empty or useless fields
    data.push(preprocessDoctype(json))
  }

  // Return the doctypes
  return data
}

async function init(session, fields, options) {
  const files = await createTimetable(session, fields, options)

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
}

module.exports = init
