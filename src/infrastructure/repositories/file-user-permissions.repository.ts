import { promises as fs } from 'fs'
import path from 'path'
import { UserPermissionsRepository } from '../../application/ports/user-permissions.repository'
import { UserPermissionsStore } from '../../domain/entities/AccessControl'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'user-permissions.json')

const defaultStore = (): UserPermissionsStore => {
  const now = new Date().toISOString()
  return {
    users: [],
    updatedAt: now
  }
}

export class FileUserPermissionsRepository implements UserPermissionsRepository {
  async load(): Promise<UserPermissionsStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as UserPermissionsStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: UserPermissionsStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
