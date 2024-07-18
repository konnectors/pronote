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
const SHOULD_GET_LESSON_CONTENT = false
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

    // Récupération des dates de début et de fin de l'année scolaire
    let dateFrom = new Date(pronote.firstDate)
    const dateTo = new Date(pronote.lastDate)

    // Sauvegarde de l'identité de l'utilisateur
    await cozy_save('identity', pronote, fields)

    SAVES.forEach(async save => {
      await cozy_save(save, pronote, fields, {
        dateFrom: dateFrom,
        dateTo: dateTo,
        saveFiles: SHOULD_SAVE && true,
        getLessonContent: SHOULD_GET_LESSON_CONTENT // envoie une requête par jour (pas très bonne idée)
      })
    })
  } catch (err) {
    const error = err.toString()

    if (error.trim() === "Error: You've been rate-limited.") {
      // Pronote a bloqué temporairement l'adresse IP
      // (généralement 5 min par 60 requêtes par minute ou 5 tentatives infructueuses)
      throw new Error('VENDOR_DOWN')
    } else if (
      error.trim() === 'Error: Your username or password is incorrect.'
    ) {
      // Pronote ne reconnaît pas les identifiants
      throw new Error('LOGIN_FAILED')
    } else if (error.includes('Invalid URL')) {
      // L'URL Pronote n'est pas valide
      throw new Error('LOGIN_FAILED')
    } else if (
      JSON.stringify(err).toString().includes('Wrong user credentials')
    ) {
      // Toutatice / Educonnect ne reconnaît pas les identifiants
      throw new Error('LOGIN_FAILED')
    }

    throw new Error('UNKNOWN_ERROR')
  }
}
