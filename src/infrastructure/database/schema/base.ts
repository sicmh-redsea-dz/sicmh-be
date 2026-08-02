import { randomUUID } from 'crypto'
import { timestamp, varchar } from 'drizzle-orm/mysql-core'

export const uuid = (name: string) => varchar(name, { length: 36 })

export const primaryUuid = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID())

export const baseColumns = () => ({
  id: primaryUuid(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
})

export type EntityId = string
