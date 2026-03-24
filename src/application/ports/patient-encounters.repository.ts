import { PatientEncountersStore } from '../../domain/entities/Billing'

export interface PatientEncountersRepository {
  load(): Promise<PatientEncountersStore>
  save(store: PatientEncountersStore): Promise<void>
}
