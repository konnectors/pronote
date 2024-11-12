function createDates(options) {
  // Setting the date range
  const dateFrom = options.dateFrom || new Date()
  const dateTo = options.dateTo || new Date()

  // if datefrom is set but note dateTo, set dateTo to 3 days after dateFrom
  if (options.dateFrom && !options.dateTo) {
    dateTo.setDate(dateFrom.getDate() + 3)
  }

  // if none is set, set dateFrom to the start of this week and dateTo to the end of this week
  if (!options.dateFrom && !options.dateTo) {
    dateFrom.setDate(dateFrom.getDate() - dateFrom.getDay())
    dateTo.setDate(dateFrom.getDate() + 7)
  }

  return {
    from: dateFrom,
    to: dateTo
  }
}

function getIcalDate(date) {
  if (!date) return date
  return (
    date.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\..+/, '') +
    'Z'
  )
}

module.exports = {
  createDates,
  getIcalDate
}
