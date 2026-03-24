export interface PermissionOverride {
  grants: string[]
  revokes: string[]
  updatedAt?: string
}

export interface RolePermissionsStore {
  roles: Record<string, PermissionOverride>
  updatedAt: string
}

export interface UserPermissionOverride extends PermissionOverride {
  userId: number
}

export interface UserPermissionsStore {
  users: UserPermissionOverride[]
  updatedAt: string
}
