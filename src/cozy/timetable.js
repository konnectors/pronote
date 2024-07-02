const {
  saveFiles,
  log,
  cozyClient,
  addData,
} = require('cozy-konnector-libs')

const subPaths = require('../consts/sub_paths.json');
const doctypes = require('../consts/doctypes.json');

const use_stream = require('../utils/use_stream');
const genUUID = require('../utils/uuid');
const findObjectByPronoteString = require('../utils/format_cours_name');
const preprocessDoctype = require('../utils/preprocess_doctype');
const censor = require('../utils/use_censor');
const stack_log = require('../utils/stack_log');

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
          : lesson.exempted ?
            'EXEMPTED'
            : lesson.test ?
              'TEST'
              : 'CONFIRMED';

      let json = {
        "_id": genUUID(),
        "_type": doctypes['timetable']['lesson'],
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

      data.push(preprocessDoctype(json));
    }

    resolve(data)
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_timetable(pronote, fields, options)

      stack_log(`💾 Saving ${files.length} files to ${doctypes['timetable']['lesson']}`);

      const dtps = await addData(files, doctypes['timetable']['lesson'], {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
      });

      stack_log(JSON.stringify(dtps, null, 2));

      resolve(true);
    }
    catch (error) {
      reject(error);
    }
  });
}

module.exports = init;