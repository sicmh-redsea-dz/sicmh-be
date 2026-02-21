import { promises as fs } from 'fs'
import path from 'path'

import { BedsRepository } from '../../application/ports/beds.repository'
import { BedsStore } from '../../domain/entities/Bed'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'beds.json')

const defaultStore = (): BedsStore => {
  const now = new Date().toISOString()
  return {
    hospitalization: { beds: [], updatedAt: now },
    emergency: { beds: [], updatedAt: now }
  }
}

export class FileBedsRepository implements BedsRepository {
  async load(): Promise<BedsStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as BedsStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: BedsStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
