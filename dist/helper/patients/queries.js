"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
const queries = (key, limit, offset) => {
    let query = '';
    switch (key) {
        case 'readOne':
            query = `
        select * from pacientes where PacienteID=?;
      `;
            break;
        case 'read':
            query = `
        select * 
          from pacientes as p
        where p.isActive = 1
        limit ${limit || 25}
        offset ${offset || 0};
      `;
            break;
        case 'create':
            query = `
        insert into pacientes(Nombre, Apellido, FechaNacimiento, Telefono, CorreoElectronico, Direccion, Identificacion, Genero) values(?,?,?,?,?,?,?,?);
      `;
            break;
        case 'update':
            query = `
        update pacientes
        set Nombre=?,Apellido=?,FechaNacimiento=?,Telefono=?,CorreoElectronico=?,Direccion=?,Genero=?
        where PacienteID = ?;
      `;
            break;
        case 'total-registries':
            query = `
          select count(*) as total_registries
            from pacientes;
        `;
            break;
        case 'delete':
            query = `
          update pacientes as p 
            set p.IsActive = ? 
          where p.PacienteID = ?;
        `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.queries = queries;
