
export const queries = (key: string, limit?: number, offset?: number) => {
  let query: string = ''
  switch( key ) {
    case 'all-visits':
      query = `
        select hm.HistoriaID,
              concat(d.Nombre, ' ', d.Apellido) as NombreDoctor,
              concat(p.Nombre, ' ',p.Apellido) as NombrePaciente,
              hm.FechaUltimaVisita,
              hm.Diagnostico
          from historia_medica as hm
            inner join pacientes as p 
              on hm.PacienteID = p.PacienteID
            inner join doctores AS d 
              on hm.DoctorID = d.DoctorID
        where hm.isActive = 1
        order by hm.FechaUltimaVisita desc
        limit ${limit || 25}
        offset ${offset || 0};
      `
      break
    case 'all-docs':
      query = `
        select
          p.PersonalID, concat(p.Nombre, ' ', p.Apellido) as NombreDoctor
        from 
          personal as p;
      `
      break
    case 'create-simple-visit':
      query = `
        insert into historia_medica(
          PacienteID,
          DoctorID,
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
          isActive
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
      break
    case 'create-er-visit':
      query = `
        insert into historia_medica(
          PacienteID,
          DoctorID,
          FechaVisita,
          Notas,
          Presion,
          Oxigenacion,
          Temperatura,
          Glucometria,
          Peso,
          Altura,
          FechaUltimaVisita,
          isActive
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
      break
    case 'getOneVisit':
      query = `
        select *
          from historia_medica as hm
        where hm.HistoriaID = ?;
      `
      break
    case 'update':
      query = `
        update historia_medica
        set
          PacienteID = ?,
          DoctorID = ?,
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
          FechaUltimaVisita = ?
        where HistoriaID = ?;
      `
      break
    case 'total-registries':
      query = `
        select count(*) as total_registries
        from historia_medica as hm
          inner join pacientes as p 
            on hm.PacienteID = p.PacienteID
          inner join doctores AS d 
            on hm.DoctorID = d.DoctorID;
      `
      break
    case 'delete':
      query = `
          update historia_medica as hm 
            set hm.isActive = ? 
          where hm.HistoriaID = ?;
        `
      break;
    default: 
      query = ''
      break
  }
  return query;
}