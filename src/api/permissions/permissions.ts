export type Permission =
  | 'dashboard.view'
  | 'patients.read'
  | 'patients.create'
  | 'patients.update'
  | 'patients.delete'
  | 'visits.read'
  | 'visits.create'
  | 'visits.update'
  | 'visits.delete'
  | 'inventory.read'
  | 'inventory.create'
  | 'inventory.update'
  | 'inventory.transfer'
  | 'invoice.read'
  | 'invoice.create'
  | 'invoice.update'
  | 'invoice.delete'
  | 'schedule.create'
  | 'settings.permissions.manage'

export type RoleKey = 'admin' | 'doctor' | 'enfermera' | 'recepcionista' | 'asistente'

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'patients.read',
  'patients.create',
  'patients.update',
  'patients.delete',
  'visits.read',
  'visits.create',
  'visits.update',
  'visits.delete',
  'inventory.read',
  'inventory.create',
  'inventory.update',
  'inventory.transfer',
  'invoice.read',
  'invoice.create',
  'invoice.update',
  'invoice.delete',
  'schedule.create',
  'settings.permissions.manage'
]

const normalize = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const ROLE_ALIASES: Record<RoleKey, string[]> = {
  admin: ['admin', 'administrador', 'administrator'],
  doctor: ['doctor', 'medico', 'medic'],
  enfermera: ['enfermera', 'nurse'],
  recepcionista: ['recepcionista', 'receptionist'],
  asistente: ['asistente', 'assistant', 'attendant']
}

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  admin: ALL_PERMISSIONS,
  doctor: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'visits.create',
    'visits.update',
    'inventory.read',
    'invoice.read'
  ],
  enfermera: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'visits.create',
    'visits.update',
    'inventory.read'
  ],
  recepcionista: [
    'dashboard.view',
    'patients.read',
    'patients.create',
    'patients.update',
    'invoice.read',
    'invoice.create',
    'invoice.update',
    'schedule.create'
  ],
  asistente: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'inventory.read',
    'inventory.transfer'
  ]
}

export const normalizeRoleName = (role: string | null | undefined): RoleKey | null => {
  if (!role) return null
  const normalized = normalize(role)

  const entries = Object.entries(ROLE_ALIASES) as Array<[RoleKey, string[]]>
  for (const [roleKey, aliases] of entries) {
    if (aliases.includes(normalized)) return roleKey
  }

  return null
}

export const getPermissionsForRoles = (roles?: string[] | null): Set<Permission> => {
  const permissions = new Set<Permission>()
  if (!roles || roles.length === 0) return permissions

  roles.forEach((role) => {
    const normalizedRole = normalizeRoleName(role)
    if (!normalizedRole) return

    ROLE_PERMISSIONS[normalizedRole].forEach((permission) => {
      permissions.add(permission)
    })
  })

  return permissions
}
