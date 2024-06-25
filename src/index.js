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
    log('info', 'fields : ' + JSON.stringify(fields) + ' cozyParameters : ' + JSON.stringify(cozyParameters));
    log('info', 'url : ' + fields.pronote_url + ' login : ' + fields.login + ' password : ' + fields.password);

    // Initialisation de la session Pronote
    const pronote = await Pronote({
      url: fields.pronote_url,
      login: fields.login,
      password: fields.password
    });

    log('info', 'Pronote session initialized');

    // Sauvegarde de l'identité de l'utilisateur
    log('info', 'Saving identity');
    await cozy_save('identity', pronote, fields);
    log('info', 'Identity saved');

    // Sauvegarde de l'emploi du temps de l'utilisateur
    log('info', 'Saving timetable');
    await cozy_save('timetable', pronote, fields, {
      dateFrom: new Date('2024-05-01'),
    });
    log('info', 'Timetable saved');
  }
  catch (error) {
    log('error', error);
  }
}
