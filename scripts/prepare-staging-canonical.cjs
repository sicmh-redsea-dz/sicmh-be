const fs = require('node:fs')
const { readMigrationFiles } = require('drizzle-orm/migrator')
const migrations = readMigrationFiles({migrationsFolder:'./drizzle/tenant'})
const sql = [
  'SET NAMES utf8mb4;',
  'USE medit_global;',
  'CREATE TEMPORARY TABLE medit_qa_guard (ok TINYINT NOT NULL CHECK(ok=1));',
  "INSERT INTO medit_qa_guard SELECT COUNT(*)=1 FROM medit_global.companies WHERE code='MEDITQA' AND database_name='sicmh' AND is_active=1;",
  'CREATE DATABASE medit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
  'USE medit;',
  'CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT);',
]
for (const migration of migrations) {
  sql.push(...migration.sql.map(statement => statement.trim()).filter(Boolean).map(statement => statement.endsWith(';') ? statement : statement+';'))
  sql.push(`INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('${migration.hash}',${migration.folderMillis});`)
}
sql.push("GRANT ALL PRIVILEGES ON medit.* TO 'medit_staging'@'%';",
  'CREATE DATABASE medit_qa_global CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
  'USE medit_qa_global;',
  'CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT);')
for (const migration of readMigrationFiles({migrationsFolder:'./drizzle/global'})) {
  sql.push(...migration.sql.map(statement => statement.trim()).filter(Boolean).map(statement => statement.endsWith(';') ? statement : statement+';'))
  sql.push(`INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('${migration.hash}',${migration.folderMillis});`)
}
sql.push('INSERT INTO companies SELECT * FROM medit_global.companies;',
  "UPDATE companies SET database_name='medit' WHERE code='MEDITQA';",
  "GRANT ALL PRIVILEGES ON medit_qa_global.* TO 'medit_staging'@'%';")
fs.mkdirSync('infra/staging/migration-20261025',{recursive:true})
fs.writeFileSync('infra/staging/migration-20261025/01-canonical-schema.sql',sql.join('\n')+'\n')
console.log(`Prepared ${migrations.length} canonical migrations for a NEW MedIT QA database. Existing DB is retained.`)
