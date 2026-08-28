const BASE_SELECT = `
  SELECT
    c.CitaID, c.Titulo, c.Descripcion, c.Inicio, c.Fin,
    c.Tipo, c.Estado, c.RecursoTipo, c.RecursoID,
    c.Source, c.ExternalId, c.ChatbotSesionID, c.Notas,
    c.PersonalID, CONCAT(p.Nombre, ' ', p.Apellido) AS NombreDoctor,
    c.PacienteID, pc.Identificacion AS PacienteIdentificacion,
    COALESCE(CONCAT(pc.Nombre, ' ', pc.Apellido), c.NombrePaciente) AS NombrePaciente,
    c.CreadoPor, c.CreadoEn, c.ActualizadoEn
  FROM citas c
  LEFT JOIN personal  p  ON c.PersonalID = p.PersonalID
  LEFT JOIN pacientes pc ON c.PacienteID = pc.PacienteID
`

export const citasQueries = (key: string): string => {
  switch (key) {
    case 'list':
      return `${BASE_SELECT} WHERE c.Inicio >= ? AND c.Inicio < ? ORDER BY c.Inicio ASC`

    case 'list-upcoming':
      return `${BASE_SELECT} WHERE c.Inicio >= CURDATE() ORDER BY c.Inicio ASC LIMIT 10`

    case 'find-by-id':
      return `${BASE_SELECT} WHERE c.CitaID = ?`

    case 'create':
      return `
        INSERT INTO citas
          (Titulo, Descripcion, Inicio, Fin, PersonalID, PacienteID, NombrePaciente,
           RecursoTipo, RecursoID, Tipo, Estado, Source, ChatbotSesionID, Notas, CreadoPor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

    case 'update':
      return `
        UPDATE citas SET
          Titulo = ?, Descripcion = ?, Inicio = ?, Fin = ?,
          PersonalID = ?, PacienteID = ?, NombrePaciente = ?, RecursoTipo = ?, RecursoID = ?,
          Tipo = ?, Estado = ?, Source = ?, Notas = ?, ActualizadoEn = NOW()
        WHERE CitaID = ?
      `

    case 'find-paciente-by-identificacion':
      return `SELECT PacienteID FROM pacientes WHERE Identificacion = ? LIMIT 1`

    case 'delete':
      return `DELETE FROM citas WHERE CitaID = ?`

    case 'check-doctor-conflict':
      return `
        SELECT CitaID FROM citas
        WHERE PersonalID = ?
          AND CitaID != ?
          AND Inicio < ?
          AND Fin > ?
        LIMIT 1
      `

    case 'list-doctors':
      return `
        SELECT p.PersonalID AS id,
               CONCAT(p.Nombre, ' ', p.Apellido) AS nombre,
               p.Especialidad AS especialidad
        FROM personal p
        LEFT JOIN usuarios u ON u.UsuarioID = p.UsuarioID
        LEFT JOIN roles r ON r.RolID = u.RolId
        WHERE LOWER(TRIM(COALESCE(r.NombreRol, ''))) IN ('doctor', 'medico', 'médico', 'medic')
           OR LOWER(TRIM(COALESCE(p.Cargo, ''))) IN ('doctor', 'medico', 'médico', 'medic', 'regente')
        ORDER BY p.Nombre ASC, p.Apellido ASC
      `

    case 'list-sources':
      return `SELECT Nombre FROM cita_fuentes ORDER BY Nombre ASC`

    default:
      return ''
  }
}
