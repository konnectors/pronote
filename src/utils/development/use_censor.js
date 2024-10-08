function censor(censor) {
  var i = 0

  return function (key, value) {
    if (
      i !== 0 &&
      typeof censor === 'object' &&
      typeof value == 'object' &&
      censor == value
    )
      return '[Circular]'

    ++i // so we know we aren't using the original object anymore

    return value
  }
}

module.exports = censor
