
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
          from HistoriaMedica as hm
            inner join Pacientes as p 
              on hm.PacienteID = p.PacienteID
            inner join Doctores AS d 
              on hm.DoctorID = d.DoctorID
        order by hm.FechaUltimaVisita DESC
        limit ${limit || 25}
        offset ${offset || 0};
      `
      break
    case 'all-docs':
      query = `
        select d.DoctorID, concat(d.Nombre, ' ', d.Apellido) as NombreDoctor
          from Doctores as d;
      `
      break
    case 'create':
      query = `
        insert into HistoriaMedica(
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
          FechaUltimaVisita
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
      break
    case 'getOneVisit':
      query = `
        select *
          from HistoriaMedica as hm
        where hm.HistoriaID = ?;
      `
      break
    case 'update':
      query = `
        UPDATE HistoriaMedica
          SET
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
          WHERE HistoriaID = ?;
      `
      break
    default: 
      query = ''
      break
  }
  return query;
}