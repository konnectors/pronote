const cozyLessonFormats = require('../../consts/cozy_lesson_formats.json')

String.prototype.uppercaseFirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}

function removeSpaces(text) {
  return text.replace(/\s+/g, '')
}

function findObjectByPronoteString(pronoteString = '') {
  // Process the input string: replace dots and underscores with spaces, trim, and convert to lowercase
  let processedString = pronoteString
    .replace(/[,._]/g, ' ')
    .trim()
    .toLowerCase()

  // remove LV1, LV2, etc.
  processedString = processedString.replace(/lv\d/g, '').trim()

  // remove everything in parentheses
  processedString = processedString.replace(/\(.*\)/g, '').trim()

  // normalize accents
  processedString = processedString
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // remove special characters
  processedString = processedString.replace(/[^a-zA-Z0-9 ]/g, ' ').trim()

  // remove multiple spaces into one
  processedString = processedString.replace(/\s+/g, ' ')

  // Search for the object in the data
  for (let item of cozyLessonFormats) {
    for (let format of item.formats.default) {
      if (format.toLowerCase() === processedString) {
        return item
      }
    }
  }

  // Return null if no match is found
  return {
    label: removeSpaces(processedString),
    pretty: processedString.uppercaseFirst(),
    formats: {}
  }
}

module.exports = findObjectByPronoteString
