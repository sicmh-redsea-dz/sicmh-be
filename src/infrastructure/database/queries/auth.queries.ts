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
                        Activo,
                        firebaseID,
                        provider
                    ) 
                    values ( ?, ?, ?, ?, ?, ?, ? );
            `
            break
        case 'g-register':
            query = `
                insert into 
                    usuarios ( 
                        NombreUsuario, 
                        CorreoElectronico, 
                        RolId, 
                        Activo,
                        firebaseID,
                        provider,
                        access_token
                    ) 
                    values ( ?, ?, ?, ?, ?, ?, ? );
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
                    u.firebaseID,
                    u.SessionVersion,
                    r.NombreRol
                from usuarios as u
                    inner join roles as r
                        on u.RolId = r.RolID
                where ${column} = ?;
            `
            break
        case 'check-user':
            query=`
                select 
                    u.UsuarioID, 
                    u.NombreUsuario, 
                    u.CorreoElectronico, 
                    u.ContrasenaHash, 
                    u.Activo, 
                    u.firebaseID,
                    r.NombreRol
                from usuarios as u
                    inner join roles as r
                        on u.RolId = r.RolID
                where u.firebaseID = ?;
            `
            break
        case 'list-users':
            query = `
                select 
                    u.UsuarioID,
                    u.NombreUsuario,
                    u.CorreoElectronico,
                    u.Activo,
                    u.firebaseID,
                    r.RolID,
                    r.NombreRol
                from usuarios as u
                    inner join roles as r
                        on u.RolId = r.RolID
                order by u.UsuarioID desc;
            `
            break
        case 'count-users':
            query = `
                select count(*) as total from usuarios;
            `
            break
        case 'list-roles':
            query = `
                select 
                    r.RolID,
                    r.NombreRol
                from roles as r
                order by r.RolID asc;
            `
            break
        case 'insert-role':
            query = `
                insert into
                    roles (
                        NombreRol
                    )
                values ( ? );
            `
            break
        case 'update-role':
            query = `
                update usuarios
                set RolId = ?
                where UsuarioID = ?;
            `
            break
        case 'update-profile':
            query = `
                update usuarios
                set NombreUsuario = ?, CorreoElectronico = ?
                where UsuarioID = ?;
            `
            break
        case 'delete-user':
            query = `
                delete from usuarios
                where UsuarioID = ?;
            `
            break
        case 'change-password':
            query = `
                update usuarios
                set ContrasenaHash = ?
                where UsuarioID = ?;
            `
            break
        case 'insert-personal':
            query = `
                insert into personal (
                    Nombre,
                    Apellido,
                    Cargo,
                    Telefono,
                    CorreoElectronico,
                    FechaContratacion,
                    Especialidad,
                    UsuarioID,
                    GCalCalendarId
                ) values ( ?, ?, ?, ?, ?, ?, ?, ?, ? );
            `
            break
        case 'get-session-version':
            query = `
                SELECT SessionVersion FROM usuarios WHERE UsuarioID = ? LIMIT 1;
            `
            break
        case 'increment-session-version':
            query = `
                UPDATE usuarios SET SessionVersion = SessionVersion + 1 WHERE UsuarioID = ?;
            `
            break
        case 'set-session-version':
            query = `
                UPDATE usuarios SET SessionVersion = ? WHERE UsuarioID = ?;
            `
            break
        default:
            query = ''
            break
    }
    return query
}
