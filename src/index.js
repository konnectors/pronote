// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log } = require('cozy-konnector-libs')

// Importation de la fonction Pronote
const { Pronote } = require('./fetch/session')

// Importation de la fonction cozy_save
const { cozy_save } = require('./cozy')

// Exportation de la fonction start
module.exports = new BaseKonnector(start)

// Variable globale pour savoir si on doit sauvegarder les fichiers
const SHOULD_SAVE = false
const SHOULD_GET_LESSON_CONTENT = false // ONLY for small requests, sends a request per course to get the content of the lesson
const SAVES = ['timetable', 'homeworks', 'grades', 'presence']

// Fonction start qui va être exportée
async function start(fields) {
  try {
    log('info', 'Starting Pronote connector')

    // Initialisation de la session Pronote
    const pronote = await Pronote({
      url: fields.pronote_url,
      login: fields.login,
      password: fields.password
    })

    log('info', 'Pronote session initialized successfully : ' + pronote)

    // Gets school year dates
    let dateFrom = new Date(pronote.firstDate)
    const dateTo = new Date(pronote.lastDate)

    // Saves user identity
    await cozy_save('identity', pronote, fields)

    SAVES.forEach(async save => {
      await cozy_save(save, pronote, fields, {
        dateFrom: dateFrom,
        dateTo: dateTo,
        saveFiles: SHOULD_SAVE && true,
        getLessonContent: SHOULD_GET_LESSON_CONTENT
      })
    })
  } catch (err) {
    const error = err.toString()
    log('error', error)

    if (error.trim() === "Error: You've been rate-limited.") {
      // Pronote temporarily blocked the IP address
      // (usually 5 min/60 requests or 5 min/5 failed login attempts)
      throw new Error('VENDOR_DOWN')
    } else if (
      error.trim() === 'Error: Your username or password is incorrect.'
    ) {
      // Pronote failed to login
      throw new Error('LOGIN_FAILED')
    } else if (error.includes('Invalid URL')) {
      // Pronote URL is invalid
      throw new Error('LOGIN_FAILED')
    } else if (
      JSON.stringify(err).toString().includes('Wrong user credentials')
    ) {
      // Toutatice / Educonnect failed to login
      throw new Error('LOGIN_FAILED')
    } else if (
      JSON.stringify(err).toString().includes('Unable to resolve the challenge')
    ) {
      // Toutatice / Educonnect failed to login
      throw new Error('LOGIN_FAILED')
    }

    throw new Error('UNKNOWN_ERROR')
  }
}
