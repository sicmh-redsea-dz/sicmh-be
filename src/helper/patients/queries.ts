export const queries = (key: string, limit?: number, offset?: number) => {
  let query: string = ''
  switch( key ) {
    case 'readOne':
      query = `
        select * from pacientes where PacienteID=?;
      `
      break
    case 'read':
      query = `
        select * 
          from pacientes as p
        where p.isActive = 1
        limit ${limit || 25}
        offset ${offset || 0};
      `
      break
    case 'create':
      query = `
        insert into pacientes(Nombre, Apellido, FechaNacimiento, Telefono, CorreoElectronico, Direccion, Identificacion, Genero) values(?,?,?,?,?,?,?,?);
      `
      break
    case 'update':
      query = `
        update pacientes
        set Nombre=?,Apellido=?,FechaNacimiento=?,Telefono=?,CorreoElectronico=?,Direccion=?,Genero=?
        where PacienteID = ?;
      `
      break
    case 'total-registries':
      query = `
          select count(*) as total_registries
            from pacientes;
        `
      break;
    case 'delete':
      query = `
          update pacientes as p 
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