export const queries = (key: string, caller?: number) => {
  let query: string = ''
  switch( key ) {
    case 'getUser':
      const column = caller === 1 ? 'u.CorreoElectronico' : 'u.UsuarioID'
      query = `
        select u.UsuarioID, u.NombreUsuario, u.CorreoElectronico, u.ContrasenaHash, u.Activo, r.NombreRol
        from Usuarios as u
          inner join Roles as r
          on u.RolId = r.RolID
        where ${column} = ?;
      `
      break
    case 'register':
      query = `
        insert into Usuarios ( NombreUsuario, CorreoElectronico, ContrasenaHash, RolId, Activo ) values ( ?, ?, ?, ?, ? );
      `
      break
    default: 
      query = ''
      break
  }
  return query;
}