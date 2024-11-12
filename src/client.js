import { ContentScript } from 'cozy-clisk/dist/contentscript'
import Minilog from '@cozy/minilog'
import waitFor, { TimeoutError } from 'p-wait-for'
const log = Minilog('ContentScript')
Minilog.enable()

const baseUrl = 'about:blank'

const UUID = uuid()

monkeyPatch(UUID)

class PronoteContentScript extends ContentScript {
  async ensureAuthenticated({ account }) {
    this.log('info', '🤖 ensureAuthenticated')

    let url = account?.data?.url
    if (!url) {
      await this.setWorkerState({ visible: true })
      await this.goto(baseUrl)
      url = await this.evaluateInWorker(getUrlFromUser)
      await this.setWorkerState({ visible: false })
    }

    await this.goto(
      url + '/infoMobileApp.json?id=0D264427-EEFC-4810-A9E9-346942A862A4'
    )
    await new Promise(resolve => window.setTimeout(resolve, 2000))
    await this.evaluateInWorker(function (UUID) {
      const PRONOTE_COOKIE_EXPIRED = new Date(0).toUTCString()
      const PRONOTE_COOKIE_VALIDATION_EXPIRES = new Date(
        new Date().getTime() + 5 * 60 * 1000
      ).toUTCString()
      const PRONOTE_COOKIE_LANGUAGE_EXPIRES = new Date(
        new Date().getTime() + 365 * 24 * 60 * 60 * 1000
      ).toUTCString()
      const json = JSON.parse(document.body.innerText)
      const lJetonCas = !!json && !!json.CAS && json.CAS.jetonCAS
      document.cookie = `appliMobile=; expires=${PRONOTE_COOKIE_EXPIRED}`

      if (lJetonCas) {
        document.cookie = `validationAppliMobile=${lJetonCas}; expires=${PRONOTE_COOKIE_VALIDATION_EXPIRES}`
        document.cookie = `uuidAppliMobile=${UUID}; expires=${PRONOTE_COOKIE_VALIDATION_EXPIRES}`
        document.cookie = `ielang=1036; expires=${PRONOTE_COOKIE_LANGUAGE_EXPIRES}`
      }
    }, UUID)
    await this.goto(`${url}/mobile.eleve.html?fd=1`)

    await this.runInWorkerUntilTrue({
      method: 'waitForLoginState'
    })
    const loginState = await this.evaluateInWorker(() => window.loginState)

    const loginTokenParams = {
      url,
      kind: 6,
      login: loginState.login,
      token: loginState.mdp,
      deviceUUID: UUID
    }
    this.store = loginTokenParams

    await this.evaluateInWorker(loginTokenParams => {
      document.body.innerHTML = `<pre>
    ${JSON.stringify(loginTokenParams, null, 2)}
    </pre>`
    }, loginTokenParams)

    // TODO intercepter les identifiants ?
    return true
  }

  async ensureNotAuthenticated() {
    // always true if incognito mode
    // TODO incognito mode
    return true
  }

  async getUserDataFromWebsite() {
    this.log('info', '🤖 getUserDataFromWebsite')
    return {
      sourceAccountIdentifier: this.store.login
    }
  }

  async fetch({ account }) {
    this.log('info', '🤖 fetch')
    if (!this.bridge) {
      throw new Error(
        'No bridge is defined, you should call ContentScript.init before using this method'
      )
    }

    await this.bridge.call('saveAccountData', this.store)
    const jobResult = await this.bridge.call('runServerJob', {
      mode: 'pronote-server',
      account: account._id
    })
    console.log('🐛🐛🐛 jobResult', JSON.stringify(jobResult, null, 2))
  }

  async waitForLoginState() {
    this.log('debug', '🔧 waitForLoginState')
    await waitFor(
      () => {
        return Boolean(window.loginState)
      },
      {
        interval: 1000,
        timeout: {
          milliseconds: 60 * 1000,
          message: new TimeoutError(
            `waitForLoginState timed out after ${60 * 1000}ms`
          )
        }
      }
    )
    return true
  }
}

const connector = new PronoteContentScript()
connector
  .init({ additionalExposedMethodsNames: ['waitForLoginState'] })
  .catch(err => {
    log.warn(err)
  })
function getUrlFromUser() {
  document.body.innerHTML = `
<p>
  <label for="url">URL:</label>
  <br>
  <input id="url" type="url" value="https://0780580g.index-education.net/pronote/mobile.eleve.html">
</p>
<p>
  <input type="submit" value="Submit" id="submitButton">
</p>`

  function cleanURL(url) {
    let pronoteURL = url
    if (
      !pronoteURL.startsWith('https://') &&
      !pronoteURL.startsWith('http://')
    ) {
      pronoteURL = `https://${pronoteURL}`
    }

    pronoteURL = new URL(pronoteURL)
    // Clean any unwanted data from URL.
    pronoteURL = new URL(
      `${pronoteURL.protocol}//${pronoteURL.host}${pronoteURL.pathname}`
    )

    // Clear the last path if we're not main selection menu.
    const paths = pronoteURL.pathname.split('/')
    if (paths[paths.length - 1].includes('.html')) {
      paths.pop()
    }

    // Rebuild URL with cleaned paths.
    pronoteURL.pathname = paths.join('/')

    // Return rebuilt URL without trailing slash.
    return pronoteURL.href.endsWith('/')
      ? pronoteURL.href.slice(0, -1)
      : pronoteURL.href
  }
  return new Promise(resolve => {
    const button = document.querySelector('#submitButton')
    button.addEventListener('click', () => {
      const url = cleanURL(document.querySelector('#url').value)
      resolve(url)
    })
  })
}

function monkeyPatch(uuid) {
  window.hookAccesDepuisAppli = function () {
    this.passerEnModeValidationAppliMobile('', uuid)
  }
}

function uuid() {
  let dateTime = new Date().getTime()

  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (dateTime + Math.random() * 16) % 16 | 0
    dateTime = Math.floor(dateTime / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

  return uuid
}
