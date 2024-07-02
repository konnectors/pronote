const cozy_lesson_formats = require('../../consts/cozy_lesson_formats.json');

String.prototype.uppercaseFirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

function cw(text, width) {
  let padding = width - text.length;
  padding = padding > 0 ? padding : 0;
  text = text.length > width ? text.slice(0, width - 3) + '...' : text;
  return text + ' '.repeat(padding);
}

function findObjectByPronoteString(pronoteString) {
  // Process the input string: replace dots and underscores with spaces, trim, and convert to lowercase
  let processedString = pronoteString.replace(/[,._]/g, ' ').trim().toLowerCase();

  // remove LV1, LV2, etc.
  processedString = processedString.replace(/lv\d/g, '').trim();

  // remove everything in parentheses
  processedString = processedString.replace(/\(.*\)/g, '').trim();

  // normalize accents
  processedString = processedString.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // remove special characters
  processedString = processedString.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();

  // remove multiple spaces into one
  processedString = processedString.replace(/\s+/g, ' ');

  // Search for the object in the data
  for (let item of cozy_lesson_formats) {
    for (let format of item.formats.default) {
      if (format.toLowerCase() === processedString) {
        // console.log(`✅ Match found | ${cw(pronoteString, 20)} | ${cw(processedString, 20)} | ${cw(item.label, 20)}`);

        return item;
      }
    }
  }

  // console.log(`❌ Match found | ${cw(pronoteString, 20)} | ${cw(processedString, 20)} | ${cw(processedString, 20)}`);

  // Return null if no match is found
  return {
    "label": processedString,
    "pretty": processedString.uppercaseFirst(),
    "formats": {}
  };
}

module.exports = findObjectByPronoteString;