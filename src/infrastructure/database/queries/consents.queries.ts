export const consentsQueries = (key: string): string => {
  switch (key) {
    case 'list-templates':
      return `
        SELECT p.id, p.name, p.current_version, v.content, p.is_active,
               p.created_by, p.created_at, p.updated_at
        FROM consentimiento_plantillas p
        INNER JOIN consentimiento_plantilla_versiones v
          ON v.plantilla_id = p.id AND v.version_number = p.current_version
        WHERE (? = 1 OR p.is_active = 1)
        ORDER BY p.is_active DESC, p.name ASC
      `
    case 'find-template':
      return `
        SELECT p.id, p.name, p.current_version, v.id AS version_id, v.content,
               p.is_active, p.created_by, p.created_at, p.updated_at
        FROM consentimiento_plantillas p
        INNER JOIN consentimiento_plantilla_versiones v
          ON v.plantilla_id = p.id AND v.version_number = p.current_version
        WHERE p.id = ? LIMIT 1
      `
    case 'create-template':
      return `INSERT INTO consentimiento_plantillas (name, current_version, is_active, created_by)
              VALUES (?, 1, 1, ?)`
    case 'create-version':
      return `INSERT INTO consentimiento_plantilla_versiones
              (plantilla_id, version_number, content, created_by) VALUES (?, ?, ?, ?)`
    case 'update-template':
      return `UPDATE consentimiento_plantillas
              SET name = ?, current_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    case 'set-active':
      return `UPDATE consentimiento_plantillas SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    case 'visit-context':
      return `
        SELECT hm.HistoriaID AS visitId, hm.FechaVisita AS visitDate,
               pa.PacienteID AS patientId, CONCAT(pa.Nombre, ' ', pa.Apellido) AS patientName,
               pa.FechaNacimiento AS patientBirthDate, pa.Telefono AS patientPhone,
               pa.Identificacion AS patientIdentification,
               pe.PersonalID AS doctorId, pe.UsuarioID AS doctorUserId,
               CONCAT(pe.Nombre, ' ', pe.Apellido) AS doctorName
        FROM historia_medica hm
        INNER JOIN pacientes pa ON pa.PacienteID = hm.PacienteID
        INNER JOIN personal pe ON pe.PersonalID = hm.PersonalID
        WHERE hm.HistoriaID = ? AND hm.isActive = 1 LIMIT 1
      `
    case 'draft-context':
      return `
        SELECT NULL AS visitId, NULL AS visitDate,
               pa.PacienteID AS patientId, CONCAT(pa.Nombre, ' ', pa.Apellido) AS patientName,
               pa.FechaNacimiento AS patientBirthDate, pa.Telefono AS patientPhone,
               pa.Identificacion AS patientIdentification,
               pe.PersonalID AS doctorId, pe.UsuarioID AS doctorUserId,
               CONCAT(pe.Nombre, ' ', pe.Apellido) AS doctorName
        FROM pacientes pa
        CROSS JOIN personal pe
        WHERE pa.PacienteID = ? AND pa.isActive = 1 AND pe.PersonalID = ?
        LIMIT 1
      `
    case 'list-by-visit':
      return `
        SELECT i.id, i.template_id, i.template_version_id, i.template_name,
               v.version_number AS template_version, i.patient_id, i.record_id,
               i.doctor_id, i.status, i.acceptance_method, i.signer_type,
               i.signer_name, i.signer_identification, i.signer_relationship,
               i.signer_phone, i.attachment_id, i.accepted_at, i.created_at
        FROM consentimiento_instancias i
        INNER JOIN consentimiento_plantilla_versiones v ON v.id = i.template_version_id
        WHERE i.record_id = ?
        ORDER BY i.created_at DESC, i.id DESC
      `
    case 'create-instance':
      return `
        INSERT INTO consentimiento_instancias
          (template_id, template_version_id, template_name, patient_id, record_id,
           doctor_id, status, acceptance_method, signer_type, signer_name,
           signer_identification, signer_relationship, signer_phone, attachment_id,
           document_sha256, snapshot_json, created_by, accepted_at)
        SELECT ?, ?, p.name, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               CASE WHEN ? = 'accepted' THEN CURRENT_TIMESTAMP ELSE NULL END
        FROM consentimiento_plantillas p WHERE p.id = ?
      `
    case 'find-instance':
      return `
        SELECT i.id, i.template_id, i.template_version_id, i.template_name,
               v.version_number AS template_version, i.patient_id, i.record_id,
               i.doctor_id, i.status, i.acceptance_method, i.signer_type,
               i.signer_name, i.signer_identification, i.signer_relationship,
               i.signer_phone, i.attachment_id, i.accepted_at, i.created_at
        FROM consentimiento_instancias i
        INNER JOIN consentimiento_plantilla_versiones v ON v.id = i.template_version_id
        WHERE i.id = ? LIMIT 1
      `
    case 'accept-physical':
      return `UPDATE consentimiento_instancias
              SET status = 'accepted', acceptance_method = 'physical', attachment_id = ?,
                  document_sha256 = ?, accepted_at = CURRENT_TIMESTAMP, accepted_by = ?
              WHERE id = ? AND status = 'printed'`
    default:
      throw new Error(`Unknown consents query: ${key}`)
  }
}
