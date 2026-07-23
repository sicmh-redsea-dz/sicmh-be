import { PatientEncountersStore } from '../../domain/entities/Billing'

export interface PatientEncountersRepository {
  load(): Promise<PatientEncountersStore>
  save(store: PatientEncountersStore): Promise<void>
  /** Atomically loads, mutates, and saves the store so concurrent writers can't clobber each other. */
  update<T = void>(mutator: (store: PatientEncountersStore) => T | Promise<T>): Promise<T>
}
