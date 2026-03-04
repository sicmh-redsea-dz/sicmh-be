import { promises as fs } from 'fs'
import path from 'path'

import { ExpedienteExtra } from '../../domain/entities/Expediente'
import { ExpedienteRepository } from '../../application/ports/expediente.repository'

type ExpedienteStore = Record<string, ExpedienteExtra>

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'expedientes.json')

const ensureStore = async (): Promise<ExpedienteStore> => {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8')
    if (!raw.trim()) return {}
    return JSON.parse(raw) as ExpedienteStore
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(FILE_PATH, '{}', 'utf-8')
      return {}
    }
    throw err
  }
}

const writeStore = async (store: ExpedienteStore): Promise<void> => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export class FileExpedienteRepository implements ExpedienteRepository {
  async findByHistoryId(id: number): Promise<ExpedienteExtra | null> {
    const store = await ensureStore()
    return store[String(id)] ?? null
  }

  async upsert(historyId: number, data: ExpedienteExtra): Promise<void> {
    const store = await ensureStore()
    store[String(historyId)] = data
    await writeStore(store)
  }
}
