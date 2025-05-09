export const staffQueries = (key: string): string => {
    let query:string = ''

    switch ( key ) {
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
            `
            break
        default:
            query = ''
            break
    }

    return query
}