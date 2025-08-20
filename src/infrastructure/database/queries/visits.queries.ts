interface DelimitersArgs {
    limit?: number,
    offset?: number,
    term?: string,
    def?: boolean
}

export const visitsQueries = (key: string, delimiters?: DelimitersArgs): string => {
    let query: string = ''
    let whereClause: string = ''
    switch( key ) {
        case 'all-visits':
            const { limit, offset, term: visitTerm, def} = delimiters!
            const hasTerm = !!visitTerm

            whereClause = `
                hm.isActive = 1
                ${hasTerm ? `and (
                pc.Identificacion like concat('%', '${visitTerm}', '%') or
                pc.Nombre like concat('%', '${visitTerm}', '%') or
                pc.Apellido like concat('%', '${visitTerm}', '%') or
                pr.Nombre like concat('%', '${visitTerm}', '%') or
                pr.Apellido like concat('%', '${visitTerm}', '%')
                )` : ''}
                ${def ? `and hm.TipoVisita = 'Emergencia'` : `and hm.TipoVisita = 'Consulta'`}
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
                    hm.*,
                    concat(pa.Nombre, ' ', pa.Apellido) as NombrePaciente,
                    concat(pe.Nombre, ' ', pe.Apellido) as NombreDoctor,
                    json_arrayagg(
                        json_object(
                            'InventarioID',ihmd.InventarioID,
                            'CantidadUsada', ihmd.CantidadUsada
                        )
                    ) as InventarioUsado
                from 
                    historia_medica as hm
                inner join 
                    pacientes as pa
                    on pa.PacienteID = hm.PacienteID
                inner join 
                    personal as pe
                    on pe.PersonalID = hm.PersonalID
                left join
                    Inventario_HistoriaMedica as ihmd
                    on ihmd.HistoriaMedicaID = hm.HistoriaID
                where 
                    hm.isActive = 1 and
                    hm.HistoriaID = ?
                group by
                    hm.HistoriaID;
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
                    FechaUltimaVisita = ?,
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
        case 'get-doctor':
            const { term: doctTerm } = delimiters!
            whereClause = `
                ${
                    !!doctTerm 
                    ? (
                        `p.Nombre like concat('%', '${doctTerm}', '%') or
                        p.Apellido like concat('%', '${doctTerm}', '%')`
                    ) : ''
                }
            `
            query = `
                select 
                    p.PersonalID,
                    concat(p.Nombre, ' ', p.Apellido) as NombrePersonal,
                    p.Especialidad
                from 
                    personal as p
                where 
                    ${whereClause};
                    
            `
            break
        case 'get-patients':
            const { term: patTerm } = delimiters!
            whereClause = `
                ${
                    !!patTerm
                    ? (
                        `p.Nombre like concat('%', '${patTerm}', '%') or
                        p.Apellido like concat('%', '${patTerm}', '%')`
                    ) : ''
                }
            `
            query = `
                select 
                    p.PacienteID,
                    concat(p.Nombre, ' ', p.Apellido) as NombrePersonal
                from pacientes as p
                where 
                    ${whereClause};
                    
            `
            break
        default:
            query = ''
            break
    }
    return query
}


