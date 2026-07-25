// export const queries = (key: string, pagination?: {limit:number, offset:number}) => {
export const patientQueries = (key: string, pagination?: {limit:number, offset:number, term?: string}) => {
    let query: string = ''
    switch( key ) {
      case 'read-one':
        query = `
          select 
            p.* 
          from pacientes as p 
          where PacienteID=?;
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
            Identificacion, 
            Genero
          ) values(?,?,?,?,?,?,?,?);
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
            p.Genero=?
          where p.PacienteID = ?;
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