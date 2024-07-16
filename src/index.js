// Importation des fonctions de cozy-konnector-libs
const {
  BaseKonnector,
  log,
  signin,
  requestFactory
} = require('cozy-konnector-libs')
const Browser = require('zombie')

module.exports = new BaseKonnector(start)

const rq = requestFactory({
  jar: true, // handle the cookies like a browser
  json: false, // do not try to parse the result as a json document
  cheerio: true // automatically parse the result with [cheerio](https://github.com/cheeriojs/cheerio)
})

// Fonction start qui va être exportée
async function start(fields, cozyParameters) {
  // step 1.
  log('info', 'Authenticating ...')
  authenticate(fields.login, fields.password)
  log('info', 'Successfully logged in')
}

async function authenticate(pronote_url, username, password) {
  const educ = `https://educonnect.education.gouv.fr/idp/profile/SAML2/Redirect/SSO?execution=e1s1`
  const ttc = `https://www.toutatice.fr/portail/auth/pagemarker/3/portal/default/bureau-eleve-lyc-2020?init-state=true&redirect=true`

  const browser = new Browser({
    runScripts: false
  })
  await browser.visit(educ)

  await browser.visit(ttc, async () => {
    await browser.choose('input[value="eleve-1"]')
    await browser.pressButton('#eleve button', async () => {
      await browser.fill('j_username', 'v.linise')
      await browser.fill('j_password', 'NaomiVince20032007!')
      browser.runScripts = true
      await browser.pressButton('#bouton_valider', async () => {
        console.log(browser.html())
      })
    })
  })
}
