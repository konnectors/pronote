import {
  DOCTYPE_ATTENDANCE,
  DOCTYPE_GRADE,
  DOCTYPE_HOMEWORK,
  DOCTYPE_TIMETABLE_LESSON
} from './constants'

const { cozyClient } = require('cozy-konnector-libs')
const { Q } = require('cozy-client')

export const queryFilesByName = async name => {
  return cozyClient.new.queryAll(
    Q('io.cozy.files').indexFields(['name']).where({
      name: name
    })
  )
}

export const queryHomeworksByDate = async (fields, from, to) => {
  return cozyClient.new.queryAll(
    Q(DOCTYPE_HOMEWORK)
      .indexFields(['cozyMetadata.sourceAccountIdentifier', 'dueDate'])
      .where({
        dueDate: {
          $gte: new Date(from).toISOString(),
          $lt: new Date(to).toISOString()
        },
        'cozyMetadata.sourceAccountIdentifier': fields.login
      })
  )
}

export const queryLessonsByDate = async (fields, from, to) => {
  return cozyClient.new.queryAll(
    Q(DOCTYPE_TIMETABLE_LESSON)
      .indexFields(['cozyMetadata.sourceAccountIdentifier', 'start'])
      .where({
        start: {
          $gte: new Date(from).toISOString(),
          $lt: new Date(to).toISOString()
        },
        'cozyMetadata.sourceAccountIdentifier': fields.login
      })
      .sortBy([
        { 'cozyMetadata.sourceAccountIdentifier': 'asc' },
        { start: 'asc' }
      ])
  )
}

export const queryAllGrades = () => {
  return cozyClient.new.queryAll(Q(DOCTYPE_GRADE))
}

export const queryAllAttendances = () => {
  return cozyClient.new.queryAll(Q(DOCTYPE_ATTENDANCE))
}

export const queryIdentity = async fields => {
  return cozyClient.new.queryAll(
    Q('io.cozy.accounts')
      .indexFields(['cozyMetadata.sourceAccountIdentifier'])
      .where({
        'cozyMetadata.sourceAccountIdentifier': fields.login
      })
  )
}
