import { promises as fs } from 'fs'
import path from 'path'

import { UserProfilesRepository } from '../../application/ports/user-profiles.repository'
import { UserProfileStore } from '../../domain/entities/UserProfile'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'user-profiles.json')

const defaultStore = (): UserProfileStore => {
  const now = new Date().toISOString()
  return {
    profiles: [],
    updatedAt: now
  }
}

export class FileUserProfilesRepository implements UserProfilesRepository {
  async load(): Promise<UserProfileStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as UserProfileStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: UserProfileStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
