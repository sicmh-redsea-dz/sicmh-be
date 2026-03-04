import { PatientImageCaptureStore } from '../../domain/entities/PatientImageCapture'

export interface PatientImageCaptureRepository {
  load(): Promise<PatientImageCaptureStore>
  save(store: PatientImageCaptureStore): Promise<void>
}
