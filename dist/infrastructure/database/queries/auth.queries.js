"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authQueries = void 0;
const authQueries = (key, caller) => {
    let query = '';
    switch (key) {
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
            `;
            break;
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
            `;
            break;
        case 'get-user':
            const column = caller === 1 ? 'u.CorreoElectronico' : 'u.UsuarioID';
            query = `
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
                where ${column} = ?;
            `;
            break;
        case 'check-user':
            query = `
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
            `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.authQueries = authQueries;
