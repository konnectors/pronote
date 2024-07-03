// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log } = require('cozy-konnector-libs')

// Importation de la fonction Pronote
const { Pronote } = require('./fetch/session');

// Importation de la fonction cozy_save
const { cozy_save, cozy_test } = require('./cozy');

// Exportation de la fonction start
module.exports = new BaseKonnector(start);

// Fonction start qui va être exportée
async function start(fields, cozyParameters) {
  try {
    // Initialisation de la session Pronote
    const pronote = await Pronote({
      url: fields.pronote_url,
      login: fields.login,
      password: fields.password
    });

    // Sauvegarde de l'identité de l'utilisateur
    await cozy_save('identity', pronote, fields);

    // Sauvegarde de l'emploi du temps de l'utilisateur (3 prochains jours)
    await cozy_save('timetable', pronote, fields, {
      dateFrom: new Date(pronote.firstDate),
      dateTo: new Date(pronote.lastDate),
      saveFiles: true,
      getLessonContent: false
    });
    await cozy_test('timetable', pronote, fields);

    // Sauvegarde des devoirs de l'utilisateur (toute l'année scolaire)
    await cozy_save('homeworks', pronote, fields, {
      dateFrom: new Date(pronote.firstDate),
      dateTo: new Date(pronote.lastDate),
      saveFiles: true
    });
    await cozy_test('homeworks', pronote, fields);

    // Sauvegarde des notes de l'utilisateur (toute l'année scolaire)
    await cozy_save('grades', pronote, fields, {
      saveFiles: true
    });
    await cozy_test('grades', pronote, fields);

    // Sauvegarde des évenements de l'utilisateur (toute l'année scolaire)
    await cozy_save('presence', pronote, fields, {
      saveFiles: true
    });
    await cozy_test('presence', pronote, fields);
  }
  catch (err) {
    const error = err.toString();
    console.error(error);

    if (error.trim() === "Error: You've been rate-limited.") {
      throw new Error('VENDOR_DOWN');
    }
    else if (error.trim() === "Error: Your username or password is incorrect.") {
      throw new Error('LOGIN_FAILED');
    }
    else if (error.includes('Invalid URL')) {
      throw new Error('LOGIN_FAILED');
    }

    throw new Error('UNKNOWN_ERROR');
  }
}
