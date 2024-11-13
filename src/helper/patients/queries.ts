export const queries = (key: string, limit?: number, offset?: number) => {
  let query: string = ''
  switch( key ) {
    case 'readOne':
      query = `
        select * from Pacientes where PacienteID=?;
      `
      break
    case 'read':
      query = `
        select * 
          from Pacientes as p
        where p.isActive = 1
        limit ${limit || 25}
        offset ${offset || 0};
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
    case 'total-registries':
      query = `
          select count(*) as total_registries
            from Pacientes;
        `
      break;
    case 'delete':
      query = `
          update Pacientes as p 
            set p.IsActive = ? 
          where p.PacienteID = ?;
        `
      break;
    default: 
      query = ''
      break
  }
  return query;
}