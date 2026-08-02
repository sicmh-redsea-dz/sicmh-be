/// <reference types="node" />
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export default defineConfig({
  dialect: 'mysql',
  schema: './src/infrastructure/database/schema/global.ts',
  out: './drizzle/global',
  dbCredentials: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_GLOBAL_SCHEMA'),
  },
  strict: true,
  verbose: true,
})
