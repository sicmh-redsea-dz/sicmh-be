interface DelimitersArgs {
    limit: number,
    offset: number,
    term: string,
    def: boolean
}

export const visitsQueries = (key: string, delimiters?: DelimitersArgs): string => {
    let query: string = ''
    switch( key ) {
        case 'all-visits':
            const { limit, offset, term, def} = delimiters!
            const hasTerm = !!term

            const whereClause = `
                hm.isActive = 1
                ${hasTerm ? `and (
                pc.Identificacion like concat('%', '${term}', '%') or
                pc.Nombre like concat('%', '${term}', '%') or
                pc.Apellido like concat('%', '${term}', '%') or
                pr.Nombre like concat('%', '${term}', '%') or
                pr.Apellido like concat('%', '${term}', '%')
                )` : ''}
                ${def ? `and fac.Estado = 'Pendiente'` : ''}
            `;
            query = `
                select 
                    hm.HistoriaID,
                    concat(pr.Nombre, ' ', pr.Apellido) as NombreDoctor,
                    pc.Identificacion as IdPaciente,
                    concat(pc.Nombre, ' ', pc.Apellido) as NombrePaciente,
                    hm.FechaUltimaVisita,
                    hm.Diagnostico,
                    fac.InvoiceNumber,
                    fac.Estado,
                    count(*) over() as total_registries
                from 
                    historia_medica as hm
                    inner join 
                        pacientes as pc
                        on hm.PacienteID = pc.PacienteID
                    inner join 
                        personal as pr
                        on hm.PersonalID = pr.PersonalID
                    inner join
                        facturas as fac
                        on hm.FacturaID = fac.FacturaID
                where 
                    ${whereClause}
                order by 
                    hm.FechaUltimaVisita desc
                limit ${limit}
                offset ${offset};
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
                    FechaUltimaVisita,
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
                    PersonalID = ?,
                    Ant_Familiar = ?,
                    Ant_Habito = ?,
                    Ant_Patologico = ?,
                    Ant_Quirurgico = ?
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


