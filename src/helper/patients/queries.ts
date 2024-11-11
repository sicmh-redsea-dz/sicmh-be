export const queries = (key: string) => {
  let query: string = ''
  switch( key ) {
    case 'readOne':
      query = `
        select * from Pacientes where PacienteID=?;
      `
      break
    case 'read':
      query = `
        select * from Pacientes;
      `
      break
    case 'create':
      query = `
        insert into Pacientes(Nombre, Apellido, FechaNacimiento, Telefono, CorreoElectronico, Direccion, Genero) values(?,?,?,?,?,?,?);
      `
      break
    case 'update':
      query = `
        update Pacientes
        set Nombre=?,Apellido=?,FechaNacimiento=?,Telefono=?,CorreoElectronico=?,Direccion=?,Genero=?
        where PacienteID = ?;
      `
      break
    default: 
      query = ''
      break
  }
  return query;
}