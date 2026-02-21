import { BedsStore } from '../../domain/entities/Bed'

export interface BedsRepository {
  load(): Promise<BedsStore>
  save(store: BedsStore): Promise<void>
}
