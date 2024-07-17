function extract_pronote_name(fullName) {
  const regex = /^([A-Z -]+) ([A-Z][a-z-]+.*)$/
  const match = fullName.match(regex)

  if (match) {
    const lastName = match[1].trim()
    const firstNames = match[2].trim()
    return {
      familyName: lastName,
      givenName: firstNames
    }
  } else {
    return {
      familyName: fullName,
      givenName: fullName
    }
  }
}

module.exports = extract_pronote_name
