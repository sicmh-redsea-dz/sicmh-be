export type AttachmentSource = 'in_app_camera' | 'file_upload'

export interface ClinicalAttachment {
  id: number
  patient_id: number
  record_id: number | null
  label: string
  source: AttachmentSource
  gcs_object_path: string
  mime_type: string
  size_bytes: number
  uploaded_by: number
  created_at: string
  deleted_at: string | null
}
