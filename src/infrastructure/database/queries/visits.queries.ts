export const visitsQueries = (key: string): string => {
    let query: string = ''
    switch( key ) {
        case 'all-visits':
            query = `
                select 
                    hm.HistoriaID,
                    concat(pr.Nombre, ' ', pr.Apellido) as NombreDoctor,
                    concat(pc.Nombre, ' ', pc.Apellido) as NombrePaciente,
                    hm.FechaUltimaVisita,
                    hm.Diagnostico,
                    count(*) over() as total_registries
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
        case 'one-visit':
            query = `
                select 
                    hm.*
                from 
                    historia_medica as hm
                where 
                    hm.isActive = 1 and
                    hm.HistoriaID = ?
            `
            break
        case 'create-visit':
            query = `
                insert into historia_medica(
                    PacienteID,
                    FechaVisita,
                    Diagnostico,
                    Tratamiento,
                    Notas,
                    Presion,
                    Oxigenacion,
                    Temperatura,
                    Glucometria,
                    Peso,
                    Altura,
                    IMC,
                    PorcentajeGrasa,
                    GrasaVisceral,
                    EdadSegunPeso,
                    FechaUltimaVisita
                    isActive,
                    TipoVisita,
                    FacturaID,
                    PersonalID
                ) values (
                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                );
            `
            break
        case 'edit-visit':
            query = `
                update 
                    historia_medica
                set
                    PacienteID = ?,
                    FechaVisita = ?,
                    Diagnostico = ?,
                    Tratamiento = ?,
                    Notas = ?,
                    Presion = ?,
                    Oxigenacion = ?,
                    Temperatura = ?,
                    Glucometria = ?,
                    Peso = ?,
                    Altura = ?,
                    IMC = ?,
                    PorcentajeGrasa = ?,
                    GrasaVisceral = ?,
                    EdadSegunPeso = ?,
                    FechaUltimaVisita = now(),
                    TipoVisita = ?,
                    FacturaID = ?,
                    PersonalID = ?
                where 
                    HistoriaID = ?;
            `
            break
        case 'delete-visit':
            query = `
                update
                    historia_medica
                set
                    isActive = FALSE
                where
                    HistoriaID = ?;
            `
            break
        default:
            query = ''
            break
    }
    return query
}


