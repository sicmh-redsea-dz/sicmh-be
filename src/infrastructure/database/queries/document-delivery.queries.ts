export const insertDocumentDeliveryQuery = `
  INSERT INTO document_delivery
    (document_type, source_id, source_version, recipient_email, status,
     skip_reason, snapshot_json, source_object)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
`
