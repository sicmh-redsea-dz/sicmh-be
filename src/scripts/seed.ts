import mysql from 'mysql2/promise'
import { and, eq, isNull } from 'drizzle-orm'
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, RoleKey } from '../api/permissions/permissions'
import { config } from '../config/env'
import { createGlobalDatabase, createTenantDatabase } from '../infrastructure/database/drizzle'
import { companies } from '../infrastructure/database/schema/global'
import {
  appointmentSources,
  appointmentStatuses,
  appointmentTypes,
  inventoryLocations,
  paymentMethods,
  permissions,
  rolePermissions,
  roles,
  services,
} from '../infrastructure/database/schema/tenant'

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const roleSeeds: Array<{ key: RoleKey; name: string }> = [
  { key: 'admin', name: 'Admin' },
  { key: 'doctor', name: 'Doctor' },
  { key: 'enfermera', name: 'Enfermera' },
  { key: 'recepcionista', name: 'Recepcionista' },
  { key: 'asistente', name: 'Asistente' },
]

const main = async () => {
  const tenantSchema = required('DB_TENANT_SCHEMA')
  const companyCode = required('DEFAULT_COMPANY_CODE').toUpperCase()
  const companyName = required('DEFAULT_COMPANY_NAME')

  const globalPool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_GLOBAL_SCHEMA,
  })
  const tenantPool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: tenantSchema,
  })

  try {
    const globalDb = createGlobalDatabase(globalPool)
    const tenantDb = createTenantDatabase(tenantPool)

    await globalDb
      .insert(companies)
      .values({ code: companyCode, name: companyName, databaseName: tenantSchema })
      .onDuplicateKeyUpdate({
        set: {
          name: companyName,
          databaseName: tenantSchema,
          isActive: true,
          deletedAt: null,
        },
      })

    for (const roleSeed of roleSeeds) {
      await tenantDb
        .insert(roles)
        .values(roleSeed)
        .onDuplicateKeyUpdate({ set: { name: roleSeed.name, deletedAt: null } })
    }

    for (const permission of ALL_PERMISSIONS) {
      await tenantDb
        .insert(permissions)
        .values({ key: permission, description: permission })
        .onDuplicateKeyUpdate({ set: { description: permission, deletedAt: null } })
    }

    const activeRoles = await tenantDb.select().from(roles).where(isNull(roles.deletedAt))
    const activePermissions = await tenantDb.select().from(permissions).where(isNull(permissions.deletedAt))
    const permissionByKey = new Map(activePermissions.map((permission) => [permission.key, permission.id]))

    for (const role of activeRoles) {
      const roleKey = role.key as RoleKey
      const defaults = ROLE_PERMISSIONS[roleKey] ?? []
      for (const permissionKey of defaults) {
        const permissionId = permissionByKey.get(permissionKey)
        if (!permissionId) continue
        const [existing] = await tenantDb
          .select({ id: rolePermissions.id })
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, role.id),
            eq(rolePermissions.permissionId, permissionId),
          ))
          .limit(1)
        if (existing) {
          await tenantDb
            .update(rolePermissions)
            .set({ effect: 'grant', deletedAt: null })
            .where(eq(rolePermissions.id, existing.id))
        } else {
          await tenantDb.insert(rolePermissions).values({
            roleId: role.id,
            permissionId,
            effect: 'grant',
          })
        }
      }
    }

    const paymentMethodSeeds = [
      { code: 'cash', description: 'Efectivo' },
      { code: 'card', description: 'Tarjeta' },
      { code: 'transfer', description: 'Transferencia' },
    ]
    for (const value of paymentMethodSeeds) {
      await tenantDb.insert(paymentMethods).values(value).onDuplicateKeyUpdate({
        set: { description: value.description, deletedAt: null },
      })
    }

    const appointmentTypeSeeds = [
      { code: 'consulta', name: 'Consulta', color: '#2563EB' },
      { code: 'cirugia', name: 'Cirugía', color: '#DC2626' },
      { code: 'hospitalizacion', name: 'Hospitalización', color: '#D97706' },
      { code: 'seguimiento', name: 'Seguimiento', color: '#059669' },
      { code: 'otro', name: 'Otro', color: '#6B7280' },
    ]
    for (const value of appointmentTypeSeeds) {
      await tenantDb.insert(appointmentTypes).values(value).onDuplicateKeyUpdate({
        set: { name: value.name, color: value.color, deletedAt: null },
      })
    }

    for (const code of ['pendiente', 'confirmada', 'cancelada', 'completada']) {
      await tenantDb.insert(appointmentStatuses).values({ code, name: code }).onDuplicateKeyUpdate({
        set: { name: code, deletedAt: null },
      })
    }

    for (const code of ['manual', 'chatbot', 'google_calendar']) {
      await tenantDb.insert(appointmentSources).values({ code, name: code }).onDuplicateKeyUpdate({
        set: { name: code, deletedAt: null },
      })
    }

    const locationSeeds = [
      { code: 'main', name: 'Inventario General' },
      { code: 'outpatient', name: 'Consulta Externa' },
      { code: 'emergency', name: 'Emergencia' },
      { code: 'operating_room', name: 'Quirófano' },
    ]
    for (const value of locationSeeds) {
      await tenantDb.insert(inventoryLocations).values(value).onDuplicateKeyUpdate({
        set: { name: value.name, deletedAt: null },
      })
    }

    await tenantDb
      .insert(services)
      .values({ name: 'Consulta', description: 'Consulta médica', price: '0.00' })
      .onDuplicateKeyUpdate({ set: { description: 'Consulta médica', deletedAt: null } })

    console.log(`Seeded global company ${companyCode} and tenant ${tenantSchema}`)
  } finally {
    await Promise.all([globalPool.end(), tenantPool.end()])
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
