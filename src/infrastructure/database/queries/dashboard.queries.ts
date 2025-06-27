export const dashbQueries = (key: string): string => {
    let query: string = ''
    switch( key ) {
        case 'cards':
            query = `
                SELECT fn_dashboard_stats() AS dashboard;
            `
            break
        case 'visits':
            query = `
                select 
                    hm.HistoriaID,
                    concat(pr.Nombre, ' ', pr.Apellido) as NombreDoctor,
                    concat(pc.Nombre, ' ', pc.Apellido) as NombrePaciente,
                    hm.FechaUltimaVisita
                from 
                    historia_medica as hm
                    inner join 
                        pacientes as pc
                        on hm.PacienteID = pc.PacienteID
                    inner join 
                        personal as pr
                        on hm.PersonalID = pr.PersonalID
                where 
                    hm.isActive = 1
                order by 
                    hm.FechaUltimaVisita desc;
            `
            break
        default:
            query = ''
            break
    }
    return query
}