// Importation des fonctions de cozy-konnector-libs
const { BaseKonnector, log } = require('cozy-konnector-libs')

// Importation de la fonction Pronote
const { Pronote } = require('./fetch/session');

// Importation de la fonction cozy_save
const cozy_save = require('./cozy');

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

    // Sauvegarde de l'emploi du temps de l'utilisateur
    /*
    await cozy_save('timetable', pronote, fields, {
      dateFrom: new Date('2024-06-03'),
    });
    */
  }
  catch (error) {
    log('error', error);
  }
}
