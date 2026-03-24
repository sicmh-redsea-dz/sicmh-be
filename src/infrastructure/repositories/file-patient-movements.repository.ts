import { promises as fs } from 'fs'
import path from 'path'

import { PatientMovementsRepository } from '../../application/ports/patient-movements.repository'
import { PatientMovementsStore } from '../../domain/entities/Billing'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'patient-movements.json')

const defaultStore = (): PatientMovementsStore => {
  const now = new Date().toISOString()
  return {
    events: [],
    updatedAt: now
  }
}

export class FilePatientMovementsRepository implements PatientMovementsRepository {
  async load(): Promise<PatientMovementsStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as PatientMovementsStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: PatientMovementsStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
