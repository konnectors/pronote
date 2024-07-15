const gen_pronoteIdentifier = pronote => {
  // Student name
  let name = pronote.studentName.toLowerCase().replace(/ /g, '')
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  name = name.replace(/[^a-zA-Z0-9]/g, '')

  // School name
  let school = pronote.schoolName.toLowerCase().replace(/ /g, '')
  school = school.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  school = school.replace(/[^a-zA-Z0-9]/g, '')

  // Student class
  let studentClass = pronote.studentClass.toLowerCase().replace(/ /g, '')
  studentClass = studentClass.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  studentClass = studentClass.replace(/[^a-zA-Z0-9]/g, '')

  // School year end
  const end = new Date(pronote.lastDate).getFullYear()

  // Return the identifier
  return `${name}-${school}-${studentClass}-${end}`
}

module.exports = gen_pronoteIdentifier
