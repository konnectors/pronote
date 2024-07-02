const {
  saveFiles,
  log,
  cozyClient
} = require('cozy-konnector-libs')

const subPaths = require('../consts/sub_paths.json');

const use_stream = require('../utils/use_stream');
const genUUID = require('../utils/uuid');
const findObjectByPronoteString = require('../utils/format_cours_name');

function create_dates(options) {
  // Setting the date range
  const dateFrom = options.dateFrom || new Date();
  const dateTo = options.dateTo || new Date();

  // if datefrom is set but note dateTo, set dateTo to 3 days after dateFrom
  if (options.dateFrom && !options.dateTo) {
    dateTo.setDate(dateFrom.getDate() + 3);
  }

  // if none is set, set dateFrom to the start of this week and dateTo to the end of this week
  if (!options.dateFrom && !options.dateTo) {
    dateFrom.setDate(dateFrom.getDate() - dateFrom.getDay());
    dateTo.setDate(dateFrom.getDate() + 7);
  }

  return {
    from: dateFrom,
    to: dateTo
  };
}

async function get_timetable(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const dates = create_dates(options);
    const overview = await pronote.getTimetableOverview(dates.from, dates.to);

    const timetable = overview.parse({
      withSuperposedCanceledClasses: false,
      withCanceledClasses: true,
      withPlannedClasses: true
    });

    resolve(timetable);
  })
}

function getIcalDate(date) {
  return date.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\..+/, '') + 'Z';
}

async function create_timetable(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const timetable = await get_timetable(pronote, fields, options);
    const data = []

    for (const lesson of timetable) {
      const pronoteString = findObjectByPronoteString(lesson.subject?.name);
      const processedCoursName = pronoteString.label;
      const prettyCoursName = pronoteString.pretty;

      const dates = {
        start: getIcalDate(new Date(lesson.startDate)),
        end: getIcalDate(new Date(lesson.endDate))
      }

      const status =
        lesson.canceled ?
          'CANCELLED'
          : 'CONFIRMED';

      let json = {
        "_id": genUUID(),
        "start": dates.start,
        "end": dates.end,
        "label": prettyCoursName,
        "subject": processedCoursName,
        "sourceSubject": lesson.subject?.name || 'Cours',
        "location": lesson.classrooms.join(', '),
        "organizer": lesson.teacherNames.join(', ') + lesson.personalNames.join(', '),
        "attendee": lesson.groupNames,
        "status": status,
        "description": lesson.memo,
        "xComment": lesson.status,
        "saveDate": new Date().toISOString(),
      }

      let strg = JSON.stringify(json, null, 2)
      let stream = await use_stream(strg, 'application/json')

      data.push({
        name: `pronote-timetable-${processedCoursName}-${getIcalDate(new Date(lesson.startDate))}.txt`,
        stream: stream,
        date: {
          string: new Date(lesson.startDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          object: new Date(lesson.startDate)
        }
      })
    }

    resolve(data)
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_timetable(pronote, fields, options)

      const documents = await files.map((file, index) => {
        return {
          filename: file.name,
          filestream: file.stream,
          shouldReplaceFile: true,
          shouldReplaceName: true,
          subPath: subPaths['timetable']['timetable'] + file.date.string
        }
      });

      await saveFiles(documents, fields, {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
        concurrency: 10,
        validateFile: () => true,
        subPath: subPaths['timetable']['timetable'],
        verboseFilesLog: true
      });

      resolve(true);
    }
    catch (error) {
      reject(error);
    }
  });
}

module.exports = init;