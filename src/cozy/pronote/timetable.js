const {
  addData,
  saveFiles,
  cozyClient,
  updateOrCreate
} = require('cozy-konnector-libs')

const { Q } = require('cozy-client');

const doctypes = require('../../consts/doctypes.json');
const subPaths = require('../../consts/sub_paths.json');

const findObjectByPronoteString = require('../../utils/format/format_cours_name');
const preprocessDoctype = require('../../utils/format/preprocess_doctype');
const remove_html = require('../../utils/format/remove_html');
const { create_dates, getIcalDate } = require('../../utils/misc/create_dates');
const save_resources = require('../../utils/stack/save_resources');

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

async function create_timetable(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const timetable = await get_timetable(pronote, fields, options);
    const data = []

    let shouldSaveFiles = options['saveFiles'];
    if (shouldSaveFiles === undefined || shouldSaveFiles === null) {
      shouldSaveFiles = true;
    }
    console.log('shouldSaveFiles', shouldSaveFiles);

    let shouldGetContent = options['getLessonContent'];
    if (shouldGetContent === undefined || shouldGetContent === null) {
      shouldGetContent = true;
    }
    console.log('shouldGetContent', shouldGetContent);

    for (const lesson of timetable) {
      const pronoteString = findObjectByPronoteString(lesson.subject?.name);
      const processedCoursName = pronoteString.label;
      const prettyCoursName = pronoteString.pretty;

      let relationships = [];
      let content = null;

      try {
        if (typeof lesson.getResource === 'function' && shouldGetContent) {
          const resource = await lesson.getResource();
          content = resource && resource.contents && resource.contents[0];

          if (resource && shouldSaveFiles) {
            relationships = await save_resources(resource, subPaths['timetable']['resource'], lesson.startDate, prettyCoursName, fields);
          }
        }
      }
      catch (error) {
        console.log('ressource getting : ', error);
      }

      const dates = {
        start: new Date(lesson.startDate).toISOString(),
        end: new Date(lesson.endDate).toISOString()
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
        "xContentLabel": content && content?.title,
        "xContentDescription": content && remove_html(content?.description),
        "relationships": relationships.length > 0 ? {
          "content": {
            "data": relationships
          }
        } : null
      }

      data.push(preprocessDoctype(json));
    }

    resolve(data)
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      const files = await create_timetable(pronote, fields, options);

      /*
      [Strategy] : don't update past lessons, only update future lessons
      */

      const existing = await cozyClient.new.queryAll(
        Q(doctypes['timetable']['lesson'])
          .where({
            "start": {
              "$gte": new Date(options.dateFrom).toISOString(),
              "$lt": new Date(options.dateTo).toISOString()
            },
            "cozyMetadata.sourceAccountIdentifier": fields.login
          })
      )

      // remove duplicates in files
      const filtered = files.filter((file) => {
        const found = existing.find((item) => {
          // if item.cozyMetadata.updatedAt is less than today
          const updated = new Date(item.cozyMetadata.updatedAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const updatedRecently = updated.getTime() > today.getTime();

          // if item is more recent than today
          if (new Date(item.start) > new Date()) {
            if (!updatedRecently) {
              return false;
            }
          }

          return item.label === file.label && item.start === file.start;
        });

        return !found;
      });

      console.log(filtered.length, 'new events to save out of', files.length);

      const res = await updateOrCreate(
        filtered,
        doctypes['timetable']['lesson'],
        ['start', 'label'],
        {
          sourceAccount: this.accountId,
          sourceAccountIdentifier: fields.login,
        }
      );

      resolve(res);
    }
    catch (error) {
      reject(error);
    }
  });
}

module.exports = init;