import { PatientMovementsStore } from '../../domain/entities/Billing'

export interface PatientMovementsRepository {
  load(): Promise<PatientMovementsStore>
  save(store: PatientMovementsStore): Promise<void>
}
