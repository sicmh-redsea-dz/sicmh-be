// Explicitly scoped QA reset. Default is a read-only plan; --execute commits.
require('dotenv').config({ quiet: true })
const mysql = require('mysql2/promise')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const preserve = new Set(`__drizzle_migrations aggregate_locks appointment_sources appointment_statuses appointment_types beds consent_template_versions consent_templates insurers inventory_batches inventory_categories inventory_locations inventory_stock invoice_number_sequences operating_rooms password_reset_tokens payment_methods permission_audit_logs permissions products promotions purchase_items purchases role_permissions roles services staff_members stock_movements suppliers user_permissions user_profiles users`.split(' '))
const clear = new Set(`appointments attachment_access_logs audit_logs bed_assignments bed_events billing_ledger_entries care_episodes clinical_attachments clinical_encounters consent_instances document_deliveries emergency_contacts encounter_clinical_reviews encounter_products encounter_services encounter_vitals invoice_items invoices medical_records operating_room_assignments operating_room_events patient_clinical_profiles patient_images patient_movements patients`.split(' '))
const quote = value => '`' + value.replace(/`/g, '``') + '`'
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex')
async function main() {
  assert.equal(process.env.DB_HOST, '127.0.0.1')
  assert.equal(process.env.DB_PORT, '13306')
  assert.equal(process.env.DB_GLOBAL_SCHEMA, 'medit_qa_global')
  assert.equal(process.env.DB_TENANT_SCHEMA, 'medit')
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: 13306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'medit' })
  let committed = false
  try {
    const [[server]] = await db.query('SELECT @@server_uuid AS uuid, @@hostname AS hostname')
    assert.equal(server.uuid, '2e6f18cf-d00d-11f1-8d3a-0242ac110002')
    assert.equal(server.hostname, '2bdce8ab63f9')
    await db.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
    await db.beginTransaction()
    const [tables] = await db.query("SELECT TABLE_NAME name, ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA='medit' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
    const rows = {}, kept = {}
    for (const { name, engine } of tables) {
      assert.ok(preserve.has(name) || clear.has(name), `Unclassified table: ${name}`)
      assert.equal(engine, 'InnoDB')
      ;[rows[name]] = await db.query(`SELECT * FROM ${quote(name)} ORDER BY id FOR UPDATE`)
      kept[name] = new Set(preserve.has(name) ? rows[name].map(row => String(row.id)) : [])
    }
    // Keep the global registry byte-for-byte, too.
    const globalBefore = {}
    const [globalTables] = await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA='medit_qa_global' AND TABLE_TYPE='BASE TABLE'")
    for (const { name } of globalTables) {
      const [data] = await db.query(`SELECT * FROM medit_qa_global.${quote(name)} ORDER BY id FOR UPDATE`)
      globalBefore[name] = digest(data)
    }
    const [keys] = await db.query("SELECT CONSTRAINT_NAME constraintName,TABLE_NAME child,COLUMN_NAME childColumn,REFERENCED_TABLE_NAME parent,REFERENCED_COLUMN_NAME parentColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='medit' AND REFERENCED_TABLE_SCHEMA='medit' ORDER BY CONSTRAINT_NAME,ORDINAL_POSITION")
    const grouped = new Map()
    for (const key of keys) {
      const id = `${key.child}:${key.constraintName}`
      if (!grouped.has(id)) grouped.set(id, [])
      grouped.get(id).push(key)
    }
    // Preserve referenced parents, then associated clinical records for the retained visit/patient.
    // Audit activity is deliberately cleared; configuration history is preserved above.
    let changed
    do {
      changed = false
      for (const columns of grouped.values()) {
        const { child, parent } = columns[0]
        for (const childRow of rows[child]) {
          if (columns.some(key => childRow[key.childColumn] == null)) continue
          const parentRow = rows[parent].find(row => columns.every(key => String(row[key.parentColumn]) === String(childRow[key.childColumn])))
          assert.ok(parentRow, `Existing orphan in ${child}`)
          const keepParent = kept[child].has(String(childRow.id))
          const keepChild = clear.has(child) && child !== 'audit_logs' && clear.has(parent) && kept[parent].has(String(parentRow.id))
          if (keepParent && !kept[parent].has(String(parentRow.id))) { kept[parent].add(String(parentRow.id)); changed = true }
          if (keepChild && !kept[child].has(String(childRow.id))) { kept[child].add(String(childRow.id)); changed = true }
        }
      }
    } while (changed)
    const pending = []
    const plan = []
    for (const name of clear) {
      const removed = rows[name].filter(row => !kept[name].has(String(row.id)))
      plan.push({ table: name, before: rows[name].length, delete: removed.length, retain: kept[name].size })
      for (const row of removed) pending.push({ name, id: row.id })
    }
    console.log(JSON.stringify({ target: 'QA medit', plan }, null, 2))
    if (!process.argv.includes('--execute')) { await db.rollback(); return }
    // FK checks stay enabled. Delete leaves first; fail and roll back if a cycle blocks progress.
    while (pending.length) {
      let progress = false
      for (let index = pending.length - 1; index >= 0; index--) {
        const { name, id } = pending[index]
        try {
          const [result] = await db.execute(`DELETE FROM ${quote(name)} WHERE id = ?`, [id])
          assert.equal(result.affectedRows, 1)
          pending.splice(index, 1); progress = true
        } catch (error) {
          if (error.code !== 'ER_ROW_IS_REFERENCED_2') throw error
        }
      }
      assert.ok(progress, 'Cannot delete remaining dependency cycle; rolling back')
    }
    for (const { name } of tables) {
      const [actual] = await db.query(`SELECT * FROM ${quote(name)} ORDER BY id`)
      const expected = rows[name].filter(row => kept[name].has(String(row.id)))
      assert.equal(digest(actual), digest(expected), `Preservation check failed: ${name}`)
    }
    for (const { name } of globalTables) {
      const [actual] = await db.query(`SELECT * FROM medit_qa_global.${quote(name)} ORDER BY id`)
      assert.equal(digest(actual), globalBefore[name], `Global configuration changed: ${name}`)
    }
    await db.commit(); committed = true
    console.log('COMMITTED: retained rows verified unchanged; foreign key checks remained enabled.')
  } catch (error) {
    if (!committed) await db.rollback()
    throw error
  } finally { await db.end() }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1 })
