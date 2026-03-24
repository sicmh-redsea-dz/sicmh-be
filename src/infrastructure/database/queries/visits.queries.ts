interface DelimitersArgs {
    ext?: string,
    limit?: number,
    offset?: number,
    term?: string,
}

const validExt: Record<string, string> = {
    visits: 'Consulta' ,
    emergency: 'Emergencia' ,
    hospitalization: 'Hospitalizacion',
    'o-room': 'Quirofano'
}

export const visitsQueries = (key: string, delimiters?: DelimitersArgs): string => {
    let query: string = ''
    let whereClause: string = ''
    switch( key ) {
        case 'all-visits':
            const { limit, offset, term: visitTerm, ext} = delimiters!
            const hasTerm = !!visitTerm
            const normalizedExt = ext ? ext : ''
            const visitType = validExt[normalizedExt]
            whereClause = `
                hm.isActive = 1
                ${hasTerm ? `and (
                pc.Identificacion like concat('%', '${visitTerm}', '%') or
                pc.Nombre like concat('%', '${visitTerm}', '%') or
                pc.Apellido like concat('%', '${visitTerm}', '%') or
                pr.Nombre like concat('%', '${visitTerm}', '%') or
                pr.Apellido like concat('%', '${visitTerm}', '%')
                )` : ''}
                ${visitType ? `and hm.TipoVisita = '${visitType}'` : ''}
            `;
            query = `
                select 
                    hm.HistoriaID,
                    hm.PacienteID,
                    concat(pr.Nombre, ' ', pr.Apellido) as NombreDoctor,
                    pc.Identificacion as IdPaciente,
                    concat(pc.Nombre, ' ', pc.Apellido) as NombrePaciente,
                    hm.FechaUltimaVisita,
                    hm.TipoVisita,
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
        case 'all-visits-unbounded':
            const { term: fullTerm, ext: fullExt } = delimiters!
            const hasFullTerm = !!fullTerm
            const normalizedFullExt = fullExt ? fullExt : ''
            const fullVisitType = validExt[normalizedFullExt]
            whereClause = `
                hm.isActive = 1
                ${hasFullTerm ? `and (
                pc.Identificacion like concat('%', '${fullTerm}', '%') or
                pc.Nombre like concat('%', '${fullTerm}', '%') or
                pc.Apellido like concat('%', '${fullTerm}', '%') or
                pr.Nombre like concat('%', '${fullTerm}', '%') or
                pr.Apellido like concat('%', '${fullTerm}', '%')
                )` : ''}
                ${fullVisitType ? `and hm.TipoVisita = '${fullVisitType}'` : ''}
            `;
            query = `
                select 
                    hm.HistoriaID,
                    hm.PacienteID,
                    concat(pr.Nombre, ' ', pr.Apellido) as NombreDoctor,
                    pc.Identificacion as IdPaciente,
                    concat(pc.Nombre, ' ', pc.Apellido) as NombrePaciente,
                    hm.FechaUltimaVisita,
                    hm.TipoVisita,
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
                    hm.FechaUltimaVisita desc;
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
                    (
                        select HistoriaMedicaID, InventarioID, sum(CantidadUsada) as CantidadUsada
                        from Inventario_HistoriaMedica
                        group by HistoriaMedicaID, InventarioID
                    ) as ihmd
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
                        p.Apellido like concat('%', '${patTerm}', '%') or
                        p.Identificacion like concat('%', '${patTerm}', '%')`
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
        case 'get-stock-items':
            query = `
                select
                    *
                from
                    Inventario as i
                inner join
                    ExistenciasInventario as ei
                        on i.ProductoID = ei.ProductoID
                where ei.SubinventarioID = ?
            `
            break
        default:
            query = ''
            break
    }
    return query
}
