import { UserPermissionsStore } from '../../domain/entities/AccessControl'

export interface UserPermissionsRepository {
  load(): Promise<UserPermissionsStore>
  save(store: UserPermissionsStore): Promise<void>
}
