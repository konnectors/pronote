const {
  saveFiles,
  log,
  cozyClient
} = require('cozy-konnector-libs')

const use_stream = require('../utils/use_stream')

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

  return dateFrom, dateTo;
}

async function get_timetable(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const dates = create_dates(options);

    const overview = await pronote.getTimetableOverview(dates);

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
    const data = [];

    for (const lesson of timetable) {
      let vevent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
BEGIN:VEVENT
DTSTAMP:${getIcalDate(new Date())}
UID:${lesson.id}
DTSTART:${getIcalDate((new Date(lesson.startDate)))}
DTEND:${getIcalDate((new Date(lesson.endDate)))}
SUMMARY:${lesson.subject?.name || 'Cours'}
LOCATION:${lesson.classrooms.join(', ')}
ORGANIZER:CN=${lesson.teacherNames.join(', ')}
STATUS:${lesson.canceled ? 'CANCELLED' : 'CONFIRMED'}
END:VEVENT
END:VCALENDAR
      `.trim();

      let stream = await use_stream(vevent, 'text/calendar');

      data.push(stream);
    }

    resolve(data);
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_timetable(pronote, fields, options)

      const documents = await files.map((file, index) => {
        return {
          filename: `pronote-timetable-${index}.ics`,
          filestream: file,
          shouldReplaceFile: true,
          shouldReplaceName: true,
        }
      });
      // log('info', 'documents : ' + JSON.stringify(documents));

      await saveFiles(documents, fields, {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
        concurrency: 10,
        validateFile: false,
        subPath: 'Documents/Emploi du temps',
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