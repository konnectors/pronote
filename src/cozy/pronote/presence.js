const {
  addData,
  saveFiles,
} = require('cozy-konnector-libs')

const doctypes = require('../../consts/doctypes.json');

function get_presence(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const allPresence = [];

    const periods = pronote.periods;
    for (const period of periods) {
      const attendanceOverview = await pronote.getAttendance(period);
      for (const attendance of attendanceOverview) {
        allPresence.push(attendance);
      }
    }

    // remove each item with same id
    allPresence.forEach((item, index) => {
      allPresence.forEach((item2, index2) => {
        if (item.id === item2.id && index !== index2) {
          allPresence.splice(index2, 1);
        }
      });
    });

    resolve(allPresence);
  });
}

function create_presence(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    const presence = await get_presence(pronote, fields, options);
    const data = [];

    for (const attendance of presence) {
      let json = {};

      if ("justification" in attendance) {
        const nfrom = new Date(attendance.date);
        const nto = new Date(attendance.date);
        nto.setMinutes(attendance.date.getMinutes() + attendance.minutes);

        json = {
          "start": nfrom.toISOString(),
          "end": nto.toISOString(),
          "label": attendance.justification,
          "xJustified": attendance.justified,
          "xType": "DELAY"
        };
      }
      else if ("daysMissedInReport" in attendance) {
        json = {
          "start": new Date(attendance.from).toISOString(),
          "end": new Date(attendance.to).toISOString(),
          "label": attendance.reason,
          "xJustified": attendance.justified,
          "xType": "ABSENCE"
        };
      }
      else if ("section" in attendance) {
        const nfrom = new Date(attendance.date);
        const nto = new Date(attendance.date);
        nto.setMinutes(attendance.date.getMinutes() + 60);

        json = {
          "start": nfrom.toISOString(),
          "end": nto.toISOString(),
          "label": attendance.section && attendance.section.name,
          "xJustified": !attendance.opened,
          "xType": "OBSERVATION"
        };
      }

      data.push(json)
    }

    resolve(data);
  });
}

async function init(pronote, fields, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let files = await create_presence(pronote, fields, options);
      console.log(files);

      const res = await addData(files, doctypes['presence']['attendance'], {
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