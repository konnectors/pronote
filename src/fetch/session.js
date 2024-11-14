// Librairie Pawnote
const { loginToken, createSessionHandle } = require('pawnote')

// creates a Pawnote session using the provided credentials
async function Pronote({ url, login, token, deviceUUID }) {
  const session = createSessionHandle()
  const loginResult = await loginToken(session, {
    url,
    username: login,
    token,
    deviceUUID,
    kind: 6
  })
  return { session, loginResult }
}

module.exports = {
  Pronote
}
