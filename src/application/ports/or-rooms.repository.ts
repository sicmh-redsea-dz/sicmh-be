import { OrRoomsStore } from '../../domain/entities/OrRoom'

export interface OrRoomsRepository {
  load(): Promise<OrRoomsStore>
  save(store: OrRoomsStore): Promise<void>
}
