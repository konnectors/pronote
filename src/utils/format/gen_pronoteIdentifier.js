const gen_pronoteIdentifier = session => {
  // Student name
  let name = session.user.name.toLowerCase().replace(/ /g, '')
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  name = name.replace(/[^a-zA-Z0-9]/g, '')

  // School name
  let school = session.user.resources?.[0].establishmentName
    .toLowerCase()
    .replace(/ /g, '')
  school = school.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  school = school.replace(/[^a-zA-Z0-9]/g, '')

  // Student class
  let studentClass = session.user.resources?.[0].className
    .toLowerCase()
    .replace(/ /g, '')
  studentClass = studentClass.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  studentClass = studentClass.replace(/[^a-zA-Z0-9]/g, '')

  // School year end
  const end = new Date(session.instance.lastDate).getFullYear()

  // Return the identifier
  return `${name}-${school}-${studentClass}-${end}`
}

module.exports = gen_pronoteIdentifier
