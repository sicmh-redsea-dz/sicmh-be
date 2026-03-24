import { RolePermissionsStore } from '../../domain/entities/AccessControl'

export interface RolePermissionsRepository {
  load(): Promise<RolePermissionsStore>
  save(store: RolePermissionsStore): Promise<void>
}
