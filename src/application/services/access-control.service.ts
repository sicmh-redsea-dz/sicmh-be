import { Permission, RoleKey, getPermissionsForRoles, normalizeRoleName, ALL_PERMISSIONS } from '../../api/permissions/permissions'
import { RolePermissionsRepository } from '../ports/role-permissions.repository'
import { UserPermissionsRepository } from '../ports/user-permissions.repository'
import { PermissionOverride } from '../../domain/entities/AccessControl'

const normalizeKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export class AccessControlService {
  constructor(
    private readonly roleRepo: RolePermissionsRepository,
    private readonly userRepo: UserPermissionsRepository
  ) {}

  listAllPermissions(): Permission[] {
    return [...ALL_PERMISSIONS]
  }

  async getRoleOverrides(): Promise<Record<string, PermissionOverride>> {
    const store = await this.roleRepo.load()
    return store.roles ?? {}
  }

  async getUserOverrides(): Promise<Record<string, PermissionOverride>> {
    const store = await this.userRepo.load()
    const map: Record<string, PermissionOverride> = {}
    store.users.forEach((item) => {
      map[item.userId] = { grants: item.grants ?? [], revokes: item.revokes ?? [], updatedAt: item.updatedAt }
    })
    return map
  }

  async updateRoleOverride(roleKey: string, grants: Permission[], revokes: Permission[]) {
    const normalized = normalizeKey(roleKey)
    const store = await this.roleRepo.load()
    const now = new Date().toISOString()
    store.roles[normalized] = {
      grants: this.sanitizePermissions(grants),
      revokes: this.sanitizePermissions(revokes),
      updatedAt: now
    }
    store.updatedAt = now
    await this.roleRepo.save(store)
    return store.roles[normalized]
  }

  async updateUserOverride(userId: string, grants: Permission[], revokes: Permission[]) {
    const store = await this.userRepo.load()
    const now = new Date().toISOString()
    const existing = store.users.find((u) => u.userId === userId)
    const payload = {
      userId,
      grants: this.sanitizePermissions(grants),
      revokes: this.sanitizePermissions(revokes),
      updatedAt: now
    }
    if (existing) {
      existing.grants = payload.grants
      existing.revokes = payload.revokes
      existing.updatedAt = now
    } else {
      store.users.push(payload)
    }
    store.updatedAt = now
    await this.userRepo.save(store)
    return payload
  }

  async resolvePermissions(roles: string[] | null | undefined, userId?: string) {
    const permissions = getPermissionsForRoles(roles)
    const [roleOverrides, userOverrides] = await Promise.all([
      this.roleRepo.load(),
      this.userRepo.load()
    ])

    const roleList = Array.isArray(roles) ? roles : roles ? [String(roles)] : []
    roleList.forEach((role) => {
      const normalized = normalizeRoleName(role) ?? normalizeKey(role)
      const override = roleOverrides.roles?.[normalized]
      if (!override) return
      override.grants?.forEach((perm) => permissions.add(perm as Permission))
      override.revokes?.forEach((perm) => permissions.delete(perm as Permission))
    })

    if (userId) {
      const override = userOverrides.users?.find((u) => u.userId === userId)
      override?.grants?.forEach((perm) => permissions.add(perm as Permission))
      override?.revokes?.forEach((perm) => permissions.delete(perm as Permission))
    }

    return permissions
  }

  private sanitizePermissions(list: Permission[]): Permission[] {
    const allowed = new Set(ALL_PERMISSIONS)
    return (list || []).filter((perm) => allowed.has(perm))
  }
}
