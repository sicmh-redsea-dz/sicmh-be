import { drizzle } from 'drizzle-orm/mysql2'
import { Pool } from 'mysql2/promise'
import * as globalSchema from './schema/global'
import * as tenantRelations from './schema/relations'
import * as tenantTables from './schema/tenant'

export const tenantSchema = {
  ...tenantTables,
  ...tenantRelations,
}

export const createGlobalDatabase = (pool: Pool) =>
  drizzle(pool, { schema: globalSchema, mode: 'default' })

export const createTenantDatabase = (pool: Pool) =>
  drizzle(pool, { schema: tenantSchema, mode: 'default' })

export type GlobalDatabase = ReturnType<typeof createGlobalDatabase>
export type TenantDatabase = ReturnType<typeof createTenantDatabase>
