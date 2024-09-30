const { authenticatePronoteQRCode } = require('pawnote')
const uuid = require('../utils/misc/uuid')
const { log } = require('cozy-konnector-libs')
const pronoteAPI = require('pronote-api-maintained')

async function ENTPronoteLogin({ url, login, password, casName }) {
  // uses pronote-api (deprecated) to login to the instance
  // pronote-api contains function to log into ENT using their SSO credentials, exposing an ENT-specific Pronote session, but the API is too old to be used as an entrypoint for data
  const session = await pronoteAPI.login(url, login, password, casName)

  // Sends to PRONOTE the API request to geenerate a mobile app token
  // The mobile app token allows to create a mobile app authentification code that can regenerate a new session
  const QRData = await pronoteAPI.request(session, 'JetonAppliMobile', {
    donnees: {
      // We're using a random 4-digit code as a PIN code, it's used to sign the QR code data (handled by Pawnote)
      code: Math.floor(1000 + Math.random() * 9000).toString()
    },
    _Signature_: {
      onglet: 7
    }
  })

  // retreives the QR code data and the PIN code (sent back in response)
  const QRInfo = {
    // PRONOTE ultra high security sends back the ultra secret pin code (in plain text) in the response
    pinCode: QRData.RapportSaisie.code,
    dataFromQRCode: {
      // these tokens doesn't allow to log in but just allows us to generate final login tokens
      jeton: QRData.donnees.jeton,
      login: QRData.donnees.login,
      // adding mobile app URL to log in to mobile API (Pawnote logs in using mobile API because it allows to regenerate final login tokens as much as we want)
      url: url + 'mobile.eleve.html'
    },
    // generates a random UUID for the device
    deviceUUID: uuid()
  }

  try {
    // Pawnote handles decryption of the QR code data and generates the final login tokens
    const pronote = await authenticatePronoteQRCode(QRInfo)

    log(
      'info',
      `Pronote session created [${pronote.username} : ${pronote.studentName}]`
    )

    return pronote
  } catch (error) {
    log('err', 'Error during ENT login')
    throw new Error('ENT_ERR')
  }
}

// Return a CAS name if it's a ENT, else it returns undefined
function getCasName(info) {
  if (!info.entURL) {
    return undefined
  }
  const url = info.entURL
  if (url.includes('ent.netocentre.fr')) {
    return 'ac-orleans-tours'
  } else if (url.includes('cas.eclat-bfc.fr')) {
    return 'ac-besancon'
  } else if (url.includes('mon.lyceeconnecte.fr')) {
    return 'ac-bordeaux'
  } else if (url.includes('ent2d.ac-bordeaux.fr')) {
    return 'ac-bordeaux2'
  } else if (url.includes('fip.itslearning.com')) {
    return 'ac-caen'
    /* } else if (url.includes('cas.ent.auvergnerhonealpes.fr')) {
    return 'ac-clermont'*/
    /* } else if (url.includes('cas.eclat-bfc.fr')) {
    return 'ac-dijon'*/
    /* } else if (url.includes('cas.ent.auvergnerhonealpes.fr')) {
    return 'ac-grenoble'*/
  } else if (url.includes('cas.cybercolleges42.fr')) {
    return 'cybercolleges42'
  } else if (url.includes('cas.savoirsnumeriques62.fr')) {
    return 'ac-lille'
  } else if (url.includes('teleservices.ac-lille.fr')) {
    return 'ac-lille2'
    /* } else if (url.includes('mon.lyceeconnecte.fr')) {
    return 'ac-limoges'*/
  } else if (url.includes('cas.ent.auvergnerhonealpes.fr')) {
    return 'ac-lyon'
  } else if (url.includes('atrium-sud.fr')) {
    return 'atrium-sud'
  } else if (url.includes('cas.mon-ent-occitanie.fr')) {
    return 'ac-montpellier'
  } else if (url.includes('cas.monbureaunumerique.fr')) {
    return 'ac-nancy-metz'
    /* } else if (url.includes('cas.monbureaunumerique.fr')) {
    return 'ac-nancy-metz'*/
  } else if (url.includes('cas3.e-lyco.fr')) {
    return 'ac-nantes'
  } else if (url.includes('mon.lyceeconnecte.fr"')) {
    return 'ac-poitiers'
    /* } else if (url.includes('cas.monbureaunumerique.fr')) {
    return 'ac-reims'*/
  } else if (url.includes('cas.arsene76.fr')) {
    return 'arsene76'
  } else if (url.includes('nero.l-educdenormandie.fr')) {
    return 'ac-rouen'
    /* } else if (url.includes('cas.monbureaunumerique.fr')) {
    return 'ac-strasbourg'*/
    /* } else if (url.includes('cas.mon-ent-occitanie.fr')) {
    return 'ac-toulouse'*/
  } else if (url.includes('cas.moncollege.valdoise.fr')) {
    return 'ac-valdoise'
  } else if (url.includes('cas.agora06.fr')) {
    return 'agora06'
  } else if (url.includes('cas.ecollege.haute-garonne.fr')) {
    return 'haute-garonne'
  } else if (url.includes('enthdf.fr"')) {
    return 'hdf'
  } else if (url.includes('www.laclasse.com')) {
    return 'laclasse'
    /* } else if (url.includes('mon.lyceeconnecte.fr')) {
    return 'lyceeconnecte'*/
  } else if (url.includes('ent77.seine-et-marne.fr')) {
    return 'seine-et-marne'
  } else if (url.includes('college.entsomme.fr')) {
    return 'somme'
  } else if (url.includes('seshat.ac-orleans-tours.fr:8443')) {
    return 'portail-famille'
  } else if (url.includes('toutatice.fr')) {
    return 'toutatice'
  } else if (url.includes('ent.iledefrance.fr')) {
    return 'iledefrance'
  } else if (url.includes('www.moncollege-ent.essonne.fr')) {
    return 'moncollege-essonne'
  } else if (url.includes('ent.parisclassenumerique.fr')) {
    return 'parisclassenumerique'
  } else if (url.includes('cas.kosmoseducation.com')) {
    return 'ljr-munich'
  } else if (url.includes('cas.ent27.fr')) {
    return 'eure-normandie'
    /* } else if (url.includes('cas.monbureaunumerique.fr')) {
    return 'monbureaunumerique-educonnect'*/
  } else {
    return undefined
  }
}

module.exports = {
  ENTPronoteLogin,
  getCasName
}
