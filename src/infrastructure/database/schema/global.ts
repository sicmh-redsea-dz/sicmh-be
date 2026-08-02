import { boolean, index, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { baseColumns } from './base'

export const companies = mysqlTable(
  'companies',
  {
    ...baseColumns(),
    code: varchar('code', { length: 10 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    databaseName: varchar('database_name', { length: 64 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('companies_code_unique').on(table.code),
    uniqueIndex('companies_database_name_unique').on(table.databaseName),
    index('companies_active_idx').on(table.isActive, table.deletedAt),
  ],
)

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
