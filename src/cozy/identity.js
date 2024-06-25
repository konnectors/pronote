const {
  saveFiles,
  log,
  cozyClient,
  saveIdentity
} = require('cozy-konnector-libs')
const extract_pronote_name = require('../utils/extract_pronote_name')

async function create_identity(pronote, fields) {
  return new Promise(async (resolve, reject) => {
    // Getting personal information
    const information = await pronote.getPersonalInformation()

    // Getting profile picture
    const profile_pic = await save_profile_picture(pronote, fields)

    // Formatting the JSON
    const json = await format_json(pronote, information, profile_pic)

    // Returning the identity
    resolve(json)
  })
}

async function format_json(pronote, information, profile_pic) {
  return new Promise(async (resolve, reject) => {
    const identity = {
      // _id: genUUID(),
      source: 'connector',
      identifier: pronote.username,
      contact: {
        fullname: pronote.studentName && pronote.studentName,
        name: pronote.studentName && extract_pronote_name(pronote.studentName),
        email: information.email && [
          {
            adress: information.email
          }
        ],
        phone: information.phone && [
          {
            number: information.phone
          }
        ],
        company: pronote.schoolName,
        jobTitle: 'Élève de ' + pronote.studentClass
      },
      student: {
        ine: information.INE,
        class: pronote.studentClass,
        school: pronote.schoolName
      },
      relationships: profile_pic._id && {
        picture: {
          // photo de profil
          data: { _id: profile_pic._id, _type: 'io.cozy.files' }
        }
      }
    }

    log('info', JSON.stringify(identity))

    resolve(identity)
  })
}

async function save_profile_picture(pronote, fields) {
  const documents = [
    {
      filename: 'Photo de classe.jpg',
      fileurl: pronote.studentProfilePictureURL,
      shouldReplaceFile: false,
      subPath: 'Documents/Élève'
    }
  ]

  const files = await saveFiles(documents, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login,
    concurrency: 1,
    validateFile: false
  })

  const meta = await cozyClient.files.statByPath(
    fields.folderPath + '/Documents/Élève/Photo de classe.jpg'
  )

  return meta || null
}

async function init(pronote, fields) {
  try {
    let identity = await create_identity(pronote, fields)
    return saveIdentity(identity, fields.login)
  }
  catch (error) {
    log('error', error)
    return false
  }
}

module.exports = init
