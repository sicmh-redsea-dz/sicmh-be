"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffQueries = void 0;
const staffQueries = (key) => {
    let query = '';
    switch (key) {
        case 'all-docs':
            query = `
                select
                    p.PersonalID,
                    concat(p.Nombre, ' ', p.Apellido) as NombrePersonal,
                    p.Especialidad,
                    p.UsuarioID
                from 
                    personal as p
                where 
                    p.Cargo = 'regente';
            `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.staffQueries = staffQueries;
