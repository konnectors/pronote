const { updateOrCreate } = require('cozy-konnector-libs')

const { DOCTYPE_ATTENDANCE } = require('../../constants')

async function get_presence(pronote) {
  const allPresence = []

  const periods = pronote.periods
  for (const period of periods) {
    const attendanceOverview = await pronote.getAttendance(period)
    for (const attendance of attendanceOverview) {
      allPresence.push(attendance)
    }
  }

  // remove each item with same id
  allPresence.forEach((item, index) => {
    allPresence.forEach((item2, index2) => {
      if (item.id === item2.id && index !== index2) {
        allPresence.splice(index2, 1)
      }
    })
  })

  return allPresence
}

async function createPresence(pronote, fields, options) {
  const presence = await get_presence(pronote, fields, options)
  const data = []

  for (const attendance of presence) {
    let json = {}

    if ('justification' in attendance) {
      const nfrom = new Date(attendance.date)
      const nto = new Date(attendance.date)
      nto.setMinutes(attendance.date.getMinutes() + attendance.minutes)

      json = {
        start: nfrom.toISOString(),
        end: nto.toISOString(),
        label: attendance.justification,
        xJustified: attendance.justified,
        xType: 'DELAY'
      }
    } else if ('daysMissedInReport' in attendance) {
      json = {
        start: new Date(attendance.from).toISOString(),
        end: new Date(attendance.to).toISOString(),
        label: attendance.reason,
        xJustified: attendance.justified,
        xType: 'ABSENCE'
      }
    } else if ('section' in attendance) {
      const nfrom = new Date(attendance.date)
      const nto = new Date(attendance.date)
      nto.setMinutes(attendance.date.getMinutes() + 60)

      json = {
        start: nfrom.toISOString(),
        end: nto.toISOString(),
        label: attendance.section && attendance.section.name,
        xJustified: !attendance.opened,
        xType: 'OBSERVATION'
      }
    }

    data.push(json)
  }

  return data
}

async function init(pronote, fields, options) {
  try {
    let files = await createPresence(pronote, fields, options)

    /*
    [Strategy] : only update events that are NOT justified yet
    */

    // remove all justified absences
    const filtered = files.filter(file => {
      return file.xJustified === false
    })

    const res = await updateOrCreate(
      filtered,
      DOCTYPE_ATTENDANCE,
      ['label', 'start'],
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
