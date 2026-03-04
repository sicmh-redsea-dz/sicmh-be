import { PatientImageStore } from '../../domain/entities/PatientImage'

export interface PatientImagesRepository {
  load(): Promise<PatientImageStore>
  save(store: PatientImageStore): Promise<void>
}
