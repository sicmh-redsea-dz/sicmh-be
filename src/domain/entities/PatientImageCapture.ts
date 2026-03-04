export type PatientImageCaptureStatus = 'pending' | 'uploaded' | 'expired'

export interface PatientImageCaptureRecord {
  token: string
  status: PatientImageCaptureStatus
  createdAt: string
  updatedAt: string
  expiresAt: string
  image?: {
    contentType: string
    data: string
    size: number
    fileName?: string
  }
}

export interface PatientImageCaptureStore {
  updatedAt: string
  sessions: Record<string, PatientImageCaptureRecord>
}
