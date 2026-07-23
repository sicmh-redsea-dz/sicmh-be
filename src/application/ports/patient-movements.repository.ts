import { PatientMovementsStore } from '../../domain/entities/Billing'

export interface PatientMovementsRepository {
  load(): Promise<PatientMovementsStore>
  save(store: PatientMovementsStore): Promise<void>
  /** Atomically loads, mutates, and saves the store so concurrent writers can't clobber each other. */
  update<T = void>(mutator: (store: PatientMovementsStore) => T | Promise<T>): Promise<T>
}
