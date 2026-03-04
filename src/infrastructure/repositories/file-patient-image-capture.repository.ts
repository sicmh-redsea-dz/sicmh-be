import { promises as fs } from 'fs'
import path from 'path'

import { PatientImageCaptureRepository } from '../../application/ports/patient-image-capture.repository'
import { PatientImageCaptureStore } from '../../domain/entities/PatientImageCapture'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'patient-image-captures.json')

const defaultStore = (): PatientImageCaptureStore => ({
  updatedAt: new Date().toISOString(),
  sessions: {}
})

export class FilePatientImageCaptureRepository implements PatientImageCaptureRepository {
  async load(): Promise<PatientImageCaptureStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as PatientImageCaptureStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: PatientImageCaptureStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }
}
