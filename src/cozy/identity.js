const {
  saveFiles,
  log,
  cozyClient,
  saveIdentity
} = require('cozy-konnector-libs')

const subPaths = require('../consts/sub_paths.json');

const extract_pronote_name = require('../utils/extract_pronote_name')
const censor = require('../utils/use_censor');
const stack_log = require('../utils/stack_log');

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
    const etabInfo = pronote.user?.listeInformationsEtablissements['V'][0];
    const scAdress = etabInfo['Coordonnees'];

    const address = [];

    if (information.city && information.city.trim() !== '') {
      address.push({
        type: 'Personnal',
        label: 'home',
        city: information.city,
        region: information.province,
        street: information.address[0],
        country: information.country,
        code: information.postalCode,
        formattedAddress: information.address.join(' '),
      });
    }

    if (scAdress && scAdress['LibelleVille']) {
      address.push({
        type: 'School',
        label: 'work',
        city: scAdress['LibelleVille'],
        region: scAdress['Province'],
        street: scAdress['Adresse1'],
        country: scAdress['Pays'],
        code: scAdress['CodePostal'],
        formattedAddress: scAdress['Adresse1'] + ', ' + scAdress['CodePostal'] + ' ' + scAdress['LibelleVille'] + ', ' + scAdress['Pays']
      })
    }

    const identity = {
      // _id: genUUID(),
      source: 'connector',
      identifier: pronote.username,
      contact: {
        fullname: pronote.studentName && pronote.studentName,
        name: pronote.studentName && extract_pronote_name(pronote.studentName),
        email: information.email && [
          {
            address: information.email,
            type: "Profressional",
            label: 'work',
            primary: true
          }
        ],
        phone: information.phone && [
          {
            number: information.phone,
            type: "Personnal",
            label: 'home',
            primary: true
          }
        ],
        address: address,
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

    resolve(identity)
  })
}

async function save_profile_picture(pronote, fields) {
  stack_log('🖼️ Saving profile picture at ' + subPaths['identity']['profile_pic'])

  const documents = [
    {
      filename: 'Photo de classe.jpg',
      fileurl: pronote.studentProfilePictureURL,
      shouldReplaceFile: false,
      subPath: subPaths['identity']['profile_pic']
    }
  ]

  const files = await saveFiles(documents, fields, {
    sourceAccount: this.accountId,
    sourceAccountIdentifier: fields.login,
    concurrency: 1,
    validateFile: false
  })

  const meta = files[0];
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
