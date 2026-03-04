import { promises as fs } from 'fs'
import path from 'path'

import { OrRoomsRepository } from '../../application/ports/or-rooms.repository'
import { OrRoomsStore } from '../../domain/entities/OrRoom'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'or-rooms.json')

const defaultStore = (): OrRoomsStore => {
  const now = new Date().toISOString()
  return {
    rooms: [],
    updatedAt: now
  }
}

export class FileOrRoomsRepository implements OrRoomsRepository {
  async load(): Promise<OrRoomsStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as OrRoomsStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: OrRoomsStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
