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
const { create_dates, getIcalDate } = require('../../utils/misc/create_dates');
const save_resources = require('../../utils/stack/save_resources');

function get_grades(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const allGrades = [];

    const periods = pronote.periods;
    for (const period of periods) {
      const gradesOverview = await pronote.getGradesOverview(period);

      for (const grade of gradesOverview.grades) {
        const subject = grade.subject;

        const subjectIndex = allGrades.findIndex((item) => item.subject.name === subject.name && item.period === period);
        if (subjectIndex === -1) {
          allGrades.push({
            subject: subject,
            period: period,
            averages: {},
            grades: []
          });
        }

        const subjectIndex2 = allGrades.findIndex((item) => item.subject.name === subject.name && item.period === period);
        allGrades[subjectIndex2].grades.push(grade);
      }

      for (const average of gradesOverview.averages) {
        const subject = average.subject;

        const subjectIndex = allGrades.findIndex((item) => item.subject.name === subject.name && item.period === period);
        if (subjectIndex === -1) {
          allGrades.push({
            subject: subject,
            period: period,
            averages: {},
            grades: []
          });
        }

        const subjectIndex2 = allGrades.findIndex((item) => item.subject.name === subject.name && item.period === period);
        allGrades[subjectIndex2].averages = average;
      }
    }

    resolve(allGrades);
  })
}

function create_grades(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const grades = await get_grades(pronote, fields, options);
    const data = [];

    for (const grade of grades) {
      const pronoteString = findObjectByPronoteString(grade.subject?.name);
      const processedCoursName = pronoteString.label;
      const prettyCoursName = pronoteString.pretty;

      let subjectFiles = [];
      let correctionFiles = [];


      const evals = [];

      for (const evl of grade.grades) {
        const id = new Date(evl.date).getTime() + "_" + processedCoursName + "_" + (evl.comment || "grd");

        if (evl.subjectFile && evl.subjectFile.url) {
          const filesToDownload = [];

          const date = new Date(evl.date);
          const prettyDate = date.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit', weekday: 'short' });

          const extension = evl.subjectFile.name.split('.').pop();
          let fileName = evl.subjectFile.name.replace(/\.[^/.]+$/, "") + ` (${prettyDate})` || 'Rendu devoir du ' + prettyDate;

          filesToDownload.push({
            filename: `${fileName}.${extension}`,
            fileurl: evl.subjectFile.url,
            shouldReplaceFile: false,
            subPath: subPaths['grades']['subjects'].replace('{subject}', prettyCoursName),
            fileAttributes: {
              created_at: date,
              updated_at: date,
            }
          });

          const data = await saveFiles(filesToDownload, fields, {
            sourceAccount: this.accountId,
            sourceAccountIdentifier: fields.login,
            concurrency: 1,
            validateFile: () => true
          })

          for (const file of data) {
            if (file['fileDocument']) {
              subjectFiles.push({
                resource: {
                  data: {
                    _id: file['fileDocument']['_id'],
                    _type: 'io.cozy.files',
                    "metadata": {
                      "gradeId": id
                    }
                  }
                }
              });
            }
          }
        }

        if (evl.correctionFile && evl.correctionFile.url) {
          const filesToDownload = [];

          const date = new Date(evl.date);
          const prettyDate = date.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit', weekday: 'short' });

          const extension = evl.correctionFile.name.split('.').pop();
          let fileName = evl.correctionFile.name.replace(/\.[^/.]+$/, "") + ` (${prettyDate})` || 'Rendu devoir du ' + prettyDate;

          filesToDownload.push({
            filename: `${fileName}.${extension}`,
            fileurl: evl.correctionFile.url,
            shouldReplaceFile: false,
            subPath: subPaths['grades']['correction'].replace('{subject}', prettyCoursName),
            fileAttributes: {
              created_at: date,
              updated_at: date,
            }
          });

          const data = await saveFiles(filesToDownload, fields, {
            sourceAccount: this.accountId,
            sourceAccountIdentifier: fields.login,
            concurrency: 1,
            validateFile: () => true
          })

          for (const file of data) {
            if (file['fileDocument']) {
              correctionFiles.push({
                resource: {
                  data: {
                    _id: file['fileDocument']['_id'],
                    _type: 'io.cozy.files',
                    "metadata": {
                      "gradeId": id
                    }
                  }
                }
              });
            }
          }
        }

        const njs = {
          "id": id,
          "label": evl.comment.trim() !== '' ? evl.comment : null,
          "date": new Date(evl.date).toISOString(),
          "value": {
            "student": evl.value,
            "outOf": evl.outOf,
            "coef": evl.coefficient,
            "classAverage": evl.average,
            "classMax": evl.max,
            "classMin": evl.min,
          },
          "status": {
            "isBonus": evl.isBonus,
            "isOptional": evl.isOptional,
          }
        }

        evals.push(njs);
      }

      const json = {
        "subject": processedCoursName,
        "sourceSubject": grade.subject?.name || 'Cours',
        "title": grade.period.name,
        "startDate": new Date(grade.period.start).toISOString(),
        "endDate": new Date(grade.period.end).toISOString(),
        "aggregation": {
          "avgGrades": grade.averages.student,
          "avgClass": grade.averages.class_average,
          "maxClass": grade.averages.max,
          "minClass": grade.averages.min,
        },
        "series": evals,
        "relationships": subjectFiles.length > 0 || correctionFiles.length > 0 ? {
          "files": {
            "data": subjectFiles
          },
          "corrections": {
            "data": correctionFiles
          }
        } : null
      };

      data.push(preprocessDoctype(json));
    }

    resolve(data);
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_grades(pronote, fields, options);

      const res = await addData(files, doctypes['homeworks']['homework'], {
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