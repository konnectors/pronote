const preprocessDoctype = json => {
  // remove all fields that have an undefined, empty string or null value
  Object.keys(json).forEach(key => {
    if (
      json[key] === undefined ||
      json[key] === '' ||
      json[key] === null ||
      (typeof json[key] === 'object' && Object.keys(json[key]).length === 0)
    ) {
      delete json[key]
    }
  })

  return json
}

module.exports = preprocessDoctype
