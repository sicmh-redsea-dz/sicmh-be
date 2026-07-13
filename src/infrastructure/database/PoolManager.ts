import mysql, { Pool } from 'mysql2/promise'
import { config } from '../../config/env'

export interface Empresa {
  CodigoEmpresa: string
  NombreBaseDatos: string
  ServidorDB: string
  PuertoDB: number
  Activo: number
}

interface TenantEntry {
  pool: Pool
  dbName: string
  lastUsed: number
}

const IDLE_MS  = 10 * 60 * 1000  // 10 minutes
const EVICT_MS =  5 * 60 * 1000  //  5 minutes

class PoolManagerClass {
  private readonly tenants = new Map<string, TenantEntry>()
  private global: Pool | null = null

  init(): void {
    this.global = mysql.createPool({
      host                 : config.DB_HOST,
      user                 : config.DB_USER,
      password             : config.DB_PASSWORD,
      database             : 'medit_global',
      port                 : parseInt(config.DB_PORT || '3306', 10),
      waitForConnections   : true,
      connectionLimit      : 3,
      queueLimit           : 10,
      connectTimeout       : 10000,
      enableKeepAlive      : true,
      keepAliveInitialDelay: 0,
      dateStrings          : true,
    })

    const timer = setInterval(() => this.evict(), EVICT_MS)
    if (timer.unref) timer.unref()
  }

  globalPool(): Pool {
    if (!this.global) throw new Error('PoolManager not initialized. Call init() at server startup.')
    return this.global
  }

  async resolveEmpresa(codigoEmpresa: string): Promise<Empresa> {
    const key = codigoEmpresa.toUpperCase()
    const sql = 'SELECT CodigoEmpresa, NombreBaseDatos, ServidorDB, PuertoDB, Activo FROM empresas WHERE CodigoEmpresa = ? LIMIT 1'
    let rows: any[]
    try {
      ;[rows] = await this.globalPool().execute<any[]>(sql, [key])
    } catch (err: any) {
      if (err?.code === 'ECONNRESET' || err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.errno === -4077) {
        ;[rows] = await this.globalPool().execute<any[]>(sql, [key])
      } else {
        throw err
      }
    }
    const empresa: Empresa = rows[0]
    if (!empresa) {
      throw Object.assign(new Error('Código de empresa no encontrado.'), { name: 'not_found_error' })
    }
    if (!empresa.Activo) {
      throw Object.assign(new Error('La cuenta de la empresa está inactiva.'), { name: 'inactive_company' })
    }
    return empresa
  }

  async getPool(codigoEmpresa: string): Promise<{ pool: Pool; dbName: string }> {
    const key = codigoEmpresa.toUpperCase()
    const existing = this.tenants.get(key)
    if (existing) {
      existing.lastUsed = Date.now()
      return { pool: existing.pool, dbName: existing.dbName }
    }

    const empresa = await this.resolveEmpresa(key)
    const pool = mysql.createPool({
      host                 : empresa.ServidorDB,
      user                 : config.DB_USER,
      password             : config.DB_PASSWORD,
      database             : empresa.NombreBaseDatos,
      port                 : empresa.PuertoDB,
      waitForConnections   : true,
      connectionLimit      : 3,
      queueLimit           : 20,
      connectTimeout       : 10000,
      enableKeepAlive      : true,
      keepAliveInitialDelay: 0,
      dateStrings          : true,
    })

    this.tenants.set(key, { pool, dbName: empresa.NombreBaseDatos, lastUsed: Date.now() })
    return { pool, dbName: empresa.NombreBaseDatos }
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
