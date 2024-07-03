const {
  addData,
  saveFiles,
} = require('cozy-konnector-libs')

const doctypes = require('../../consts/doctypes.json');
const subPaths = require('../../consts/sub_paths.json');

const findObjectByPronoteString = require('../../utils/format/format_cours_name');
const preprocessDoctype = require('../../utils/format/preprocess_doctype');
const stack_log = require('../../utils/development/stack_log');
const remove_html = require('../../utils/format/remove_html');
const use_stream = require('../../utils/misc/use_stream');

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

      const resource = await lesson.getResource();
      const content = resource && resource.contents && resource.contents[0];
      const filesToDownload = [];
      const relationships = [];

      if (resource) {
        for (const resourceContent of resource.contents) {
          const date = new Date(lesson.startDate);
          const prettyDate = date.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit', weekday: 'short' });

          let path = subPaths['timetable']['resource']
          path = path.replace('{subject}', prettyCoursName)

          for (const file of resourceContent.files) {
            if (file.type == 1) {
              // Downloadable file
              const extension = file.name.split('.').pop();
              let fileName = file.name.replace(/\.[^/.]+$/, "");

              filesToDownload.push({
                filename: `${fileName} (${prettyDate}).${extension}`,
                fileurl: file.url,
                shouldReplaceFile: false,
                subPath: path,
                fileAttributes: {
                  created_at: date,
                  updated_at: date,
                }
              });
            }
            else if (file.type == 0) {
              // URL
              const fileData = `[InternetShortcut]
URL=${file.url}`.trim();

              const source = await use_stream(fileData, 'application/internet-shortcut');

              console.log(fileData);

              const extension = 'url';
              let fileName = file.name;

              filesToDownload.push({
                filename: `${fileName} (${prettyDate}).${extension}`,
                filestream: source,
                shouldReplaceFile: false,
                subPath: path,
                fileAttributes: {
                  created_at: date,
                  updated_at: date,
                }
              });
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
              });
            }
          }
        }
      }

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
      let files = await create_timetable(pronote, fields, options);
      console.log(JSON.stringify(files, null, 2));

      const res = await addData(files, doctypes['timetable']['lesson'], {
        sourceAccount: this.accountId,
        sourceAccountIdentifier: fields.login,
      });

      resolve(res);
    }
    catch (error) {
      reject(error);
    }
  });
}

module.exports = init;