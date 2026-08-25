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
            const { term: visitTerm, ext, limit, offset } = delimiters!
            const hasTerm = !!visitTerm
            const normalizedExt = ext ? ext : ''
            const visitType = validExt[normalizedExt]
            whereClause = `
                hm.isActive = 1
                ${!hasTerm ? `and lower(trim(fac.Estado)) = 'pendiente'` : ''}
                ${hasTerm ? `and (
                pc.Identificacion like concat('%', ?, '%') or
                pc.Nombre like concat('%', ?, '%') or
                pc.Apellido like concat('%', ?, '%') or
                pr.Nombre like concat('%', ?, '%') or
                pr.Apellido like concat('%', ?, '%')
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
                ${!hasFullTerm ? `and lower(trim(fac.Estado)) = 'pendiente'` : ''}
                ${hasFullTerm ? `and (
                pc.Identificacion like concat('%', ?, '%') or
                pc.Nombre like concat('%', ?, '%') or
                pc.Apellido like concat('%', ?, '%') or
                pr.Nombre like concat('%', ?, '%') or
                pr.Apellido like concat('%', ?, '%')
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
                    hm.FechaUltimaVisita desc
                limit 5000;
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
        case 'prescription-context':
            query = `
                select
                    hm.HistoriaID as visitId,
                    hm.FechaVisita as visitDate,
                    hm.Tratamiento as treatment,
                    hm.Diagnostico as diagnosis,
                    pa.PacienteID as patientId,
                    concat(pa.Nombre, ' ', pa.Apellido) as patientName,
                    pa.FechaNacimiento as patientBirthDate,
                    pa.Identificacion as patientIdentification,
                    pe.PersonalID as doctorId,
                    pe.UsuarioID as doctorUserId,
                    concat(pe.Nombre, ' ', pe.Apellido) as doctorName,
                    pe.Especialidad as doctorSpecialty,
                    pe.Cargo as doctorPosition,
                    pe.Telefono as doctorPhone,
                    pe.CorreoElectronico as doctorEmail,
                    pe.Direccion as doctorAddress
                from historia_medica hm
                inner join pacientes pa on pa.PacienteID = hm.PacienteID
                inner join personal pe on pe.PersonalID = hm.PersonalID
                where hm.HistoriaID = ? and hm.isActive = 1
                limit 1;
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
            whereClause = doctTerm
                ? `where (
                    p.Nombre like concat(?, '%') or
                    p.Apellido like concat(?, '%')
                )`
                : ''
            query = `
                select 
                    p.PersonalID,
                    concat(p.Nombre, ' ', p.Apellido) as NombrePersonal,
                    p.Especialidad
                from
                    personal as p
                ${whereClause}
                order by p.Nombre, p.Apellido
                limit ${doctTerm ? 20 : 500};
            `
            break
        case 'get-patients':
            const { term: patTerm } = delimiters!
            const hasFullPatientName = (patTerm?.trim().split(/\s+/).length ?? 0) > 1
            whereClause = `
                ${
                    !!patTerm
                    ? (
                        `and (
                            p.Nombre like concat(?, '%') or
                            p.Apellido like concat(?, '%') or
                            p.Identificacion like concat(?, '%') or
                            ${hasFullPatientName ? `(
                                p.Nombre like concat(?, '%') and
                                p.Apellido like concat(?, '%')
                            )` : 'false'}
                        )`
                    ) : ''
                }
            `
            query = `
                select 
                    p.PacienteID,
                    concat(p.Nombre, ' ', p.Apellido) as NombrePersonal
                from pacientes as p
                where
                    p.isActive = 1
                    ${whereClause}
                order by
                    case when p.Identificacion = ? then 0 else 1 end,
                    p.Nombre,
                    p.Apellido
                limit 20;
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
                where
                    ei.SubinventarioID = ?
                    and ei.Cantidad > 0
            `
            break
        default:
            query = ''
            break
    }
    return query
}
