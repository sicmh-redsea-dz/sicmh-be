export type AttachmentSource = 'in_app_camera' | 'file_upload'

export interface ClinicalAttachment {
  id: string
  patient_id: string
  record_id: string | null
  label: string
  source: AttachmentSource
  gcs_object_path: string
  mime_type: string
  size_bytes: number
  uploaded_by: string
  created_at: string
  deleted_at: string | null
}
