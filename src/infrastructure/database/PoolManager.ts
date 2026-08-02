import mysql, { Pool } from 'mysql2/promise'
import { and, eq, isNull } from 'drizzle-orm'
import { config } from '../../config/env'
import { companies } from './schema/global'
import {
  createGlobalDatabase,
  createTenantDatabase,
  GlobalDatabase,
  TenantDatabase,
} from './drizzle'

export interface Empresa {
  id: string
  code: string
  databaseName: string
  isActive: boolean
}

interface TenantEntry {
  pool: Pool
  db: TenantDatabase
  dbName: string
  lastUsed: number
}

const IDLE_MS  = 10 * 60 * 1000  // 10 minutes
const EVICT_MS =  5 * 60 * 1000  //  5 minutes

class PoolManagerClass {
  private readonly tenants = new Map<string, TenantEntry>()
  private global: Pool | null = null
  private globalDatabase: GlobalDatabase | null = null

  init(): void {
    this.global = mysql.createPool({
      host                 : config.DB_HOST,
      user                 : config.DB_USER,
      password             : config.DB_PASSWORD,
      database             : config.DB_GLOBAL_SCHEMA,
      port                 : config.DB_PORT,
      waitForConnections   : true,
      connectionLimit      : 3,
      queueLimit           : 10,
      connectTimeout       : 10000,
      enableKeepAlive      : true,
      keepAliveInitialDelay: 0,
      dateStrings          : true,
    })
    this.globalDatabase = createGlobalDatabase(this.global)

    const timer = setInterval(() => this.evict(), EVICT_MS)
    if (timer.unref) timer.unref()
  }

  globalPool(): Pool {
    if (!this.global) throw new Error('PoolManager not initialized. Call init() at server startup.')
    return this.global
  }

  globalDb(): GlobalDatabase {
    if (!this.globalDatabase) throw new Error('PoolManager not initialized. Call init() at server startup.')
    return this.globalDatabase
  }

  async resolveEmpresa(codigoEmpresa: string): Promise<Empresa> {
    const key = codigoEmpresa.toUpperCase()
    const [empresa] = await this.globalDb()
      .select({
        id: companies.id,
        code: companies.code,
        databaseName: companies.databaseName,
        isActive: companies.isActive,
      })
      .from(companies)
      .where(and(eq(companies.code, key), isNull(companies.deletedAt)))
      .limit(1)
    if (!empresa) {
      throw Object.assign(new Error('Código de empresa no encontrado.'), { name: 'not_found_error' })
    }
    if (!empresa.isActive) {
      throw Object.assign(new Error('La cuenta de la empresa está inactiva.'), { name: 'inactive_company' })
    }
    return empresa
  }

  async getPool(codigoEmpresa: string): Promise<{ pool: Pool; db: TenantDatabase; dbName: string }> {
    const key = codigoEmpresa.toUpperCase()
    const existing = this.tenants.get(key)
    if (existing) {
      existing.lastUsed = Date.now()
      return { pool: existing.pool, db: existing.db, dbName: existing.dbName }
    }

    const empresa = await this.resolveEmpresa(key)
    const pool = mysql.createPool({
      host                 : config.DB_HOST,
      user                 : config.DB_USER,
      password             : config.DB_PASSWORD,
      database             : empresa.databaseName,
      port                 : config.DB_PORT,
      waitForConnections   : true,
      connectionLimit      : 3,
      queueLimit           : 20,
      connectTimeout       : 10000,
      enableKeepAlive      : true,
      keepAliveInitialDelay: 0,
      dateStrings          : true,
    })
    const db = createTenantDatabase(pool)

    this.tenants.set(key, { pool, db, dbName: empresa.databaseName, lastUsed: Date.now() })
    return { pool, db, dbName: empresa.databaseName }
  }

  evictCompany(codigoEmpresa: string): void {
    const entry = this.tenants.get(codigoEmpresa.toUpperCase())
    if (entry) {
      entry.pool.end().catch(() => {})
      this.tenants.delete(codigoEmpresa.toUpperCase())
    }
  }

  private evict(): void {
    const now = Date.now()
    for (const [code, entry] of this.tenants) {
      if (now - entry.lastUsed > IDLE_MS) {
        entry.pool.end().catch(() => {})
        this.tenants.delete(code)
        console.log(`[PoolManager] Evicted idle pool for ${code}`)
      }
    }
  }
}

export const PoolManager = new PoolManagerClass()
