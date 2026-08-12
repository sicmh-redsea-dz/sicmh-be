// export const queries = (key: string, pagination?: {limit:number, offset:number}) => {
export const patientQueries = (key: string, pagination?: {limit:number, offset:number, term?: string}) => {
    let query: string = ''
    switch( key ) {
      case 'read-one':
        query = `
          select 
            p.*,
            ce.EmergencyContactID,
            ce.Nombre as EmergencyContactName,
            ce.Parentesco as EmergencyContactRelationship,
            ce.Telefono as EmergencyContactPhone,
            ce.CorreoElectronico as EmergencyContactEmail,
            ce.Direccion as EmergencyContactAddress
          from pacientes as p
          left join contacto_emergencia as ce
            on ce.EmergencyContactID = (
              select ce2.EmergencyContactID
              from contacto_emergencia as ce2
              where ce2.PacienteID = p.PacienteID
                and ce2.IsActive = 1
              order by ce2.IsPrimary desc, ce2.EmergencyContactID asc
              limit 1
            )
          where p.PacienteID=?;
        `
        break
      case 'read':
        const { limit, offset, term } = pagination!
        const hasTerm = !!term
        const whereClause = `
          p.isActive = 1
          ${
            hasTerm
            ? `
              and (
                p.Nombre like concat('%', ?, '%') or
                p.Apellido like concat('%', ?, '%') or
                p.Identificacion like concat('%', ?, '%')
              )
            ` : ''
          }
        `
        query = `
          select
            p.*,
            count(*) over() as total_registries
          from
            pacientes as p
          where
            ${whereClause}
          limit ${limit}
          offset ${offset};
        `
        break
      case 'create':
        query = `
          insert into pacientes(
            Nombre, 
            Apellido, 
            FechaNacimiento, 
            Telefono, 
            CorreoElectronico, 
            Direccion, 
            TipoIdentificacion,
            Identificacion, 
            Genero
          ) values(?,?,?,?,?,?,?,?,?);
        `
        break
      case 'update':
        query = `
          update pacientes as p
          set 
            p.Nombre=?,
            p.Apellido=?,
            p.FechaNacimiento=?,
            p.Telefono=?,
            p.CorreoElectronico=?,
            p.Direccion=?,
            p.TipoIdentificacion=?,
            p.Identificacion=?,
            p.Genero=?
          where p.PacienteID = ?;
        `
        break
      case 'find-emergency-contact':
        query = `
          select EmergencyContactID
          from contacto_emergencia
          where PacienteID = ? and IsActive = 1
          order by IsPrimary desc, EmergencyContactID asc
          limit 1;
        `
        break
      case 'create-emergency-contact':
        query = `
          insert into contacto_emergencia(
            PacienteID,
            Nombre,
            Parentesco,
            Telefono,
            CorreoElectronico,
            Direccion,
            IsPrimary,
            IsActive
          ) values(?,?,?,?,?,?,1,1);
        `
        break
      case 'update-emergency-contact':
        query = `
          update contacto_emergencia
          set
            Nombre = ?,
            Parentesco = ?,
            Telefono = ?,
            CorreoElectronico = ?,
            Direccion = ?,
            IsPrimary = 1,
            IsActive = 1,
            UpdatedAt = current_timestamp
          where EmergencyContactID = ?;
        `
        break
      case 'total-registries':
        query = `
            select count(*) as total_registries
              from pacientes as p
            where p.isActive = 1;
          `
        break;
      case 'soft-delete':
        query = `
            update pacientes as p 
            set 
              p.IsActive = ? 
            where p.PacienteID = ?;
          `
        break;
      default: 
        query = ''
        break
    }
    return query;
}
