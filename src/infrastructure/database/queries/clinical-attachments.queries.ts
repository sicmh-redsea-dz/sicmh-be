const BASE_SELECT = `
  SELECT
    id, patient_id, record_id, label, source, gcs_object_path,
    mime_type, size_bytes, uploaded_by, created_at, deleted_at
  FROM adjuntos_clinicos
`

export const clinicalAttachmentsQueries = (key: string): string => {
  switch (key) {
    case 'create':
      return `
        INSERT INTO adjuntos_clinicos
          (patient_id, record_id, label, source, gcs_object_path, mime_type, size_bytes, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

    case 'find-by-id':
      return `${BASE_SELECT} WHERE id = ? AND deleted_at IS NULL`

    case 'list-by-patient':
      return `${BASE_SELECT} WHERE patient_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC`

    case 'list-by-patient-record':
      return `${BASE_SELECT} WHERE patient_id = ? AND record_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC`

    case 'soft-delete':
      return 'UPDATE adjuntos_clinicos SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL'

    case 'log-access':
      return `
        INSERT INTO adjuntos_clinicos_accesos (attachment_id, accessed_by, ip_address)
        VALUES (?, ?, ?)
      `

    default:
      throw new Error(`Unknown clinical attachments query: ${key}`)
  }
}
