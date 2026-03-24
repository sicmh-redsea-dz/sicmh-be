import { promises as fs } from 'fs'
import path from 'path'
import { RolePermissionsRepository } from '../../application/ports/role-permissions.repository'
import { RolePermissionsStore } from '../../domain/entities/AccessControl'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'role-permissions.json')

const defaultStore = (): RolePermissionsStore => {
  const now = new Date().toISOString()
  return {
    roles: {},
    updatedAt: now
  }
}

export class FileRolePermissionsRepository implements RolePermissionsRepository {
  async load(): Promise<RolePermissionsStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as RolePermissionsStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: RolePermissionsStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
