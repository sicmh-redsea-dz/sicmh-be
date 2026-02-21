export interface PatientImageRecord {
  patientId: number
  contentType: string
  data: string
  size: number
  updatedAt: string
}

export interface PatientImageStore {
  updatedAt: string
  images: Record<string, PatientImageRecord>
}
