import { promises as fs } from 'fs'
import path from 'path'

import { PatientImagesRepository } from '../../application/ports/patient-images.repository'
import { PatientImageStore } from '../../domain/entities/PatientImage'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'patient-images.json')

const defaultStore = (): PatientImageStore => ({
  updatedAt: new Date().toISOString(),
  images: {}
})

export class FilePatientImagesRepository implements PatientImagesRepository {
  async load(): Promise<PatientImageStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as PatientImageStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: PatientImageStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
