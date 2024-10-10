export const queries = (key: string, caller?: number) => {
  let query: string = ''
  switch( key ) {
    case 'getUser':
      const column = caller === 1 ? 'us.CorreoElectronico' : 'us.UsuarioID'
      query = `
        select us.UsuarioID, us.NombreUsuario, us.CorreoElectronico, us.ContrasenaHash, us.Rol, us.Activo 
        from Usuarios as us 
        where ${column} = ?;
      `
      break
    case 'register':
      query = `
        insert into Usuarios ( NombreUsuario, CorreoElectronico, ContrasenaHash, Rol, Activo ) values ( ?, ?, ?, ?, ? );
      `
      break
    default: 
      query = ''
      break
  }
  return query;
}