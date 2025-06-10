const { saveFiles, log, saveIdentity } = require('cozy-konnector-libs')
const { account } = require('pawnote')

const { PATH_IDENTITY_PROFILE_PIC } = require('../../constants')

const extract_pronote_name = require('../../utils/format/extract_pronote_name')
const gen_pronoteIdentifier = require('../../utils/format/gen_pronoteIdentifier')

async function createIdentity(session, fields) {
  // Getting personal information
  const information = await account(session)

  // Getting profile picture
  const profile_pic = await save_profile_picture(session, fields)

  // Formatting the JSON
  const json = await format_json(session, information, profile_pic)

  // Returning the identity
  return json
}

async function format_json(session, information, profile_pic) {
  const address = []

  if (information.city && information.city.trim() !== '') {
    address.push({
      type: 'Personnal',
      label: 'home',
      city: information.city,
      region: information.province,
      street: information.address[0],
      country: information.country,
      code: information.postalCode,
      formattedAddress: information.address.join(' ')
    })
  }

  const identifier = gen_pronoteIdentifier(session)

  const identity = {
    source: 'connector',
    identifier: identifier,
    contact: {
      fullname: session.user.name && session.user.name,
      name: session.user.name && extract_pronote_name(session.user.name),
      email: information.email && [
        {
          address: information.email,
          type: 'Professional',
          label: 'work',
          primary: true
        }
      ],
      phone: information.phone && [
        {
          number: information.phone,
          type: 'Personnal',
          label: 'home',
          primary: true
        }
      ],
      address: address,
      company: session.user.resources?.[0].establishmentName,
      jobTitle: 'Élève de ' + session.user.resources?.[0].className
    },
    student: {
      ine: information.INE,
      class: session.user.resources?.[0].className,
      school: session.user.resources?.[0].establishmentName
    },
    relationships: profile_pic &&
      profile_pic['_id'] && {
        picture: {
          // Profile picture
          data: { _id: profile_pic['_id'], _type: 'io.cozy.files' }
        }
      }
  }

  return identity
}

async function save_profile_picture(session, fields) {
  log('info', `🖼️ Saving profile picture at ' + ${PATH_IDENTITY_PROFILE_PIC}`)

  if (!session.user?.resources[0]?.profilePicture) {
    log('warn', 'Found no profile picture.')
    return
  }

  const documents = [
    {
      filename: 'Photo de classe.jpg',
      fileurl: session.user.resources[0].profilePicture.url,
      shouldReplaceFile: false,
      subPath: PATH_IDENTITY_PROFILE_PIC
    }
  ]

  const files = await saveFiles(documents, fields, {
    sourceAccount: fields.account,
    sourceAccountIdentifier: fields.login,
    concurrency: 3,
    qualificationLabel: 'identity_photo', // Class photo
    validateFile: () => true
  })

  const meta = (files[0] && files[0]['fileDocument']) || null
  return meta || null
}

async function init(session, fields) {
  try {
    let identity = await createIdentity(session, fields)
    log('info', '🗣️ Saving identity for ' + identity.identifier)
    return saveIdentity(identity, fields.login)
  } catch (error) {
    log('error', error)
    return false
  }
}

module.exports = init
