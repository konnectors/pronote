// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log, cozyClient } = require('cozy-konnector-libs')
const { Q } = require('cozy-client');

// Importation de la fonction Pronote
const { Pronote } = require('./fetch/session')

// Importation de la fonction cozy_save
const { cozy_save, cozy_test } = require('./cozy')

// Exportation de la fonction start
module.exports = new BaseKonnector(start)

// Variable globale pour savoir si on doit sauvegarder les fichiers
SHOULD_SAVE = false

// Fonction start qui va être exportée
async function start(fields, cozyParameters) {
  try {
    // Initialisation de la session Pronote
    const pronote = await Pronote({
      url: fields.pronote_url,
      login: fields.login,
      password: fields.password
    })

    // Récupération des dates de début et de fin de l'année scolaire
    let dateFrom = new Date(pronote.firstDate);
    const dateTo = new Date(pronote.lastDate);

    /*
    const identity_exists = await cozyClient.new.queryAll(
      Q('io.cozy.accounts')
        .where({
          "cozyMetadata.sourceAccountIdentifier": fields.login
        })
    )

    if (identity_exists.length > 0) {
      dateFrom = new Date();
    }*/

    console.log('dateFrom', dateFrom);

    // Sauvegarde de l'identité de l'utilisateur
    await cozy_save('identity', pronote, fields)

    // Sauvegarde de l'emploi du temps de l'utilisateur (toute l'année scolaire)
    await cozy_save('timetable', pronote, fields, {
      dateFrom: dateFrom,
      dateTo: dateTo,
      saveFiles: SHOULD_SAVE && false,
      getLessonContent: false // envoie une requête par jour (pas très bonne idée)
    })
    await cozy_test('timetable', pronote, fields)

    // Sauvegarde des devoirs de l'utilisateur (toute l'année scolaire)
    await cozy_save('homeworks', pronote, fields, {
      dateFrom: dateFrom,
      dateTo: dateTo,
      saveFiles: SHOULD_SAVE && true
    });
    await cozy_test('homeworks', pronote, fields);

    // Sauvegarde des notes de l'utilisateur (toute l'année scolaire)
    await cozy_save('grades', pronote, fields, {
      saveFiles: SHOULD_SAVE && false
    })
    await cozy_test('grades', pronote, fields)

    // Sauvegarde des évenements de l'utilisateur (toute l'année scolaire)
    await cozy_save('presence', pronote, fields, {
      saveFiles: SHOULD_SAVE && true
    });
    await cozy_test('presence', pronote, fields);

  }
  catch (err) {
    const error = err.toString();
    console.error(error);

    if (error.trim() === "Error: You've been rate-limited.") {
      throw new Error('VENDOR_DOWN')
    } else if (
      error.trim() === 'Error: Your username or password is incorrect.'
    ) {
      throw new Error('LOGIN_FAILED')
    } else if (error.includes('Invalid URL')) {
      throw new Error('LOGIN_FAILED')
    }

    throw new Error('UNKNOWN_ERROR')
  }
}
