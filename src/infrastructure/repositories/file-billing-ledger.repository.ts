import { promises as fs } from 'fs'
import path from 'path'

import { BillingLedgerRepository } from '../../application/ports/billing-ledger.repository'
import { BillingLedgerStore } from '../../domain/entities/Billing'
import { withFileLock } from '../utils/file-lock'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'billing-ledger.json')

const defaultStore = (): BillingLedgerStore => {
  const now = new Date().toISOString()
  return {
    items: [],
    updatedAt: now
  }
}

export class FileBillingLedgerRepository implements BillingLedgerRepository {
  async load(): Promise<BillingLedgerStore> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
      const raw = await fs.readFile(FILE_PATH, 'utf-8')
      if (!raw.trim()) {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      return JSON.parse(raw) as BillingLedgerStore
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const store = defaultStore()
        await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
        return store
      }
      throw err
    }
  }

  async save(store: BillingLedgerStore): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  }

  async update<T>(mutator: (store: BillingLedgerStore) => T | Promise<T>): Promise<T> {
    return withFileLock(FILE_PATH, async () => {
      const store = await this.load()
      const result = await mutator(store)
      await this.save(store)
      return result
    })
  }
}
