// Librairie Pawnote
const { loginToken, createSessionHandle } = require('pawnote')
// const fs = require('fs')

// creates a Pawnote session using the provided credentials
async function Pronote(fields, accountData) {
  const session = createSessionHandle()
  await tryLogin(session, { ...fields, kind: 6 }, accountData)
  return session
}

module.exports = {
  Pronote
}

/** first try to login with with data saved in account
 * then only use fields in case the user updated login information himself
 */
async function tryLogin(session, params, accountData = {}) {
  try {
    const result = await loginToken(session, { ...params, ...accountData })
    return result
  } catch (err) {
    if (err.name === 'BadCredentialsError') {
      const result = await loginToken(session, params)
      return result
    }
    throw err
  }
}

// function updateKonnectorDevConfigFields(loginResult) {
//   const current = JSON.parse(fs.readFileSync('./konnector-dev-config.json'))
//   const updated = {
//     ...current,
//     fields: {
//       ...current.fields,
//       token: loginResult.token,
//       navigatorIdentifier: loginResult.navigatorIdentifier
//     }
//   }
//   fs.writeFileSync(
//     './konnector-dev-config.json',
//     JSON.stringify(updated, null, 2)
//   )
// }
