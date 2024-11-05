process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://417de448d3ca82b66be0698f6ad71d2b@errors.cozycloud.cc/77'

// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log } = require('cozy-konnector-libs')

// Importation de la fonction Pronote
const { Pronote } = require('./fetch/session')

// Importation de la fonction cozy_save
const { cozy_save } = require('./cozy')

// Exportation de la fonction start
module.exports = new BaseKonnector(start)

// Variable globale pour savoir si on doit sauvegarder les fichiers
const SHOULD_SAVE = true
const SHOULD_GET_LESSON_CONTENT = false // ONLY for small requests, sends a request per course to get the content of the lesson
const SAVES = [
  'timetable',
  'homeworks',
  'grades'
  // 'presence'
]

// Fonction start qui va être exportée
async function start(fields) {
  try {
    log('info', 'Starting Pronote connector')

    // Initialisation de la session Pronote
    await this.deactivateAutoSuccessfulLogin()
    const { session, loginResult } = await Pronote(
      fields,
      this.getAccountData()
    )
    await this.saveAccountData({
      token: loginResult.token,
      navigatorIdentifier: loginResult.navigatorIdentifier
    })
    await this.notifySuccessfulLogin()

    log(
      'info',
      'Pronote session initialized successfully : ' + session.instance
    )

    // Gets school year dates
    let dateFrom = new Date(session.instance.firstDate)
    let dateToday = new Date()
    const dateTo = new Date(session.instance.lastDate)

    // Saves user identity
    await cozy_save('identity', session, fields)

    SAVES.forEach(async save => {
      await cozy_save(save, session, fields, {
        dateFrom: SAVES === 'homeworks' ? dateToday : dateFrom,
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
    } else if (error.includes('TOUTATICE_ERR')) {
      // If TOUTATICE_ERR is thrown, the IP address is suspended OR Pronote / Toutatice / Educonnect is down
      throw new Error('VENDOR_DOWN')
    }

    throw new Error('UNKNOWN_ERROR')
  }
}
