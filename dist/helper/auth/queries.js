"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
const queries = (key, caller) => {
    let query = '';
    switch (key) {
        case 'getUser':
            const column = caller === 1 ? 'u.CorreoElectronico' : 'u.UsuarioID';
            query = `
        select u.UsuarioID, u.NombreUsuario, u.CorreoElectronico, u.ContrasenaHash, u.Activo, r.NombreRol
        from usuarios as u
          inner join roles as r
          on u.RolId = r.RolID
        where ${column} = ?;
      `;
            break;
        case 'register':
            query = `
        insert into usuarios ( NombreUsuario, CorreoElectronico, ContrasenaHash, RolId, Activo ) values ( ?, ?, ?, ?, ? );
      `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.queries = queries;
