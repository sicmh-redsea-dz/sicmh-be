import { OrRoomsStore } from '../../domain/entities/OrRoom'

export interface OrRoomsRepository {
  load(): Promise<OrRoomsStore>
  save(store: OrRoomsStore): Promise<void>
  update<T>(mutator: (store: OrRoomsStore) => T | Promise<T>): Promise<T>
}
