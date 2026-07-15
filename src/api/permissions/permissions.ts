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
  | 'visits.inventory.manage'
  | 'inventory.read'
  | 'inventory.create'
  | 'inventory.update'
  | 'inventory.transfer'
  | 'invoice.read'
  | 'invoice.create'
  | 'invoice.update'
  | 'invoice.delete'
  | 'schedule.read'
  | 'schedule.create'
  | 'schedule.update'
  | 'schedule.delete'
  | 'attachments.read'
  | 'attachments.create'
  | 'attachments.delete'
  | 'settings.permissions.manage'

export type RoleKey = 'admin' | 'doctor' | 'enfermera' | 'recepcionista' | 'asistente'

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'patients.read',
  'patients.create',
  'patients.update',
  'patients.delete',
  'visits.read',
  'visits.create',
  'visits.update',
  'visits.delete',
  'visits.inventory.manage',
  'inventory.read',
  'inventory.create',
  'inventory.update',
  'inventory.transfer',
  'invoice.read',
  'invoice.create',
  'invoice.update',
  'invoice.delete',
  'schedule.read',
  'schedule.create',
  'schedule.update',
  'schedule.delete',
  'attachments.read',
  'attachments.create',
  'attachments.delete',
  'settings.permissions.manage'
]

// Feature-gated permissions are excluded from every role's defaults (including
// admin) so they stay off for all tenants until granted per tenant via the
// permissions overrides.
export const FEATURE_GATED_PERMISSIONS: Permission[] = [
  'visits.inventory.manage'
]

const DEFAULT_ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (permission) => !FEATURE_GATED_PERMISSIONS.includes(permission)
)

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
  admin: DEFAULT_ADMIN_PERMISSIONS,
  doctor: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'visits.create',
    'visits.update',
    'inventory.read',
    'invoice.read',
    'schedule.read',
    'schedule.create',
    'schedule.update',
    'schedule.delete',
    'attachments.read',
    'attachments.create',
    'attachments.delete',
  ],
  enfermera: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'visits.create',
    'visits.update',
    'inventory.read',
    'schedule.read',
    'attachments.read',
    'attachments.create',
  ],
  recepcionista: [
    'dashboard.view',
    'patients.read',
    'patients.create',
    'patients.update',
    'invoice.read',
    'invoice.create',
    'invoice.update',
    'schedule.read',
    'schedule.create',
    'schedule.update',
    'schedule.delete',
    'attachments.read',
  ],
  asistente: [
    'dashboard.view',
    'patients.read',
    'visits.read',
    'inventory.read',
    'inventory.transfer',
    'attachments.read',
  ]
}

export const normalizeRoleName = (role: string | null | undefined): RoleKey | null => {
  if (!role) return null
  const normalized = normalize(role)

  const entries = Object.entries(ROLE_ALIASES) as Array<[RoleKey, string[]]>
  for (const [roleKey, aliases] of entries) {
    if (aliases.includes(normalized)) return roleKey
  }

  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('doctor') || normalized.includes('medic')) return 'doctor'
  if (normalized.includes('enfermer') || normalized.includes('nurse')) return 'enfermera'
  if (normalized.includes('recep')) return 'recepcionista'
  if (normalized.includes('asisten') || normalized.includes('attendant')) return 'asistente'

  return null
}

export const getPermissionsForRoles = (roles?: string[] | null): Set<Permission> => {
  const permissions = new Set<Permission>()
  if (!roles || roles.length === 0) return permissions

  const roleList = Array.isArray(roles)
    ? roles
    : [String(roles)]

  const normalizedRoles = roleList
    .flatMap((role) => String(role).split(/[|,]/))
    .map((role) => role.trim())
    .filter(Boolean)

  normalizedRoles.forEach((role) => {
    const normalizedRole = normalizeRoleName(role)
    if (!normalizedRole) return

    ROLE_PERMISSIONS[normalizedRole].forEach((permission) => {
      permissions.add(permission)
    })
  })

  return permissions
}
