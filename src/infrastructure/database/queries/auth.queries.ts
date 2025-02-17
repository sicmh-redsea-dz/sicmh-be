export const authQueries = (key: string, caller?:number) => {
    let query:string = ''
    switch ( key ) {
        case 'register':
            query = `
                insert into 
                    usuarios ( 
                        NombreUsuario, 
                        CorreoElectronico, 
                        ContrasenaHash, 
                        RolId, 
                        Activo 
                    ) 
                    values ( ?, ?, ?, ?, ? );
            `
            break
        case 'get-user':
            const column = caller === 1 ? 'u.CorreoElectronico' : 'u.UsuarioID'
            query = `
                select 
                    u.UsuarioID, 
                    u.NombreUsuario, 
                    u.CorreoElectronico, 
                    u.ContrasenaHash, 
                    u.Activo, 
                    r.NombreRol
                from usuarios as u
                    inner join roles as r
                        on u.RolId = r.RolID
                where ${column} = ?;
            `
            break
        default:
            query = ''
            break
    }
    return query
}