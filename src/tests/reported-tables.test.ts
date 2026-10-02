import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { is, Table } from 'drizzle-orm'
import * as tables from '../infrastructure/database/schema/tenant'
import { nextInvoiceSequenceNumber, validateInvoiceSequence } from '../application/services/invoice-number-sequences.service'
import { auditRequestTarget } from '../api/middlewares/audit.middleware'
import { DocumentDeliveriesService } from '../application/services/document-deliveries.service'
import { trackDocumentDelivery } from '../api/middlewares/document-delivery'

test('migration snapshot contains every tenant table, column and foreign key', () => {
  const snapshot = JSON.parse(readFileSync('drizzle/tenant/meta/0003_snapshot.json', 'utf8'))
  const definitions = Object.values(tables).filter((table) => is(table, Table)).map((table) => getTableConfig(table))
  assert.equal(Object.keys(snapshot.tables).length, definitions.length)
  for (const definition of definitions) {
    const saved = snapshot.tables[definition.name]
    assert.ok(saved, definition.name)
    assert.deepEqual(Object.keys(saved.columns).sort(), definition.columns.map((column) => column.name).sort())
    assert.deepEqual(Object.keys(saved.foreignKeys).sort(), definition.foreignKeys.map((key) => key.getName()).sort())
    assert.deepEqual(Object.keys(saved.checkConstraint).sort(), definition.checks.map(check => check.name).sort())
    assert.deepEqual(Object.keys(saved.indexes).sort(), definition.indexes.map(index => index.config.name).sort())
    for (const key of definition.foreignKeys) assert.ok(key.getName().length <= 64, key.getName())
  }
  const migration = readFileSync('drizzle/tenant/0001_restore_reported_tables.sql', 'utf8')
  for (const name of ['consent_templates', 'consent_template_versions', 'consent_instances', 'document_deliveries', 'password_reset_tokens', 'invoice_number_sequences', 'audit_logs']) {
    assert.ok(migration.includes(`CREATE TABLE \`${name}\``), name)
  }
})

test('SAR starts at the inclusive minimum, accepts the last number and rejects exhaustion', () => {
  const values = validateInvoiceSequence({ code: 'test', cai: 'test-cai', prefix: '001-', minNumber: 10, maxNumber: 11, padding: 4 })
  assert.deepEqual(nextInvoiceSequenceNumber({ ...values, currentNumber: 9 }), { number: 10, formatted: '001-0010' })
  assert.equal(nextInvoiceSequenceNumber({ ...values, currentNumber: 10 }).number, 11)
  assert.throws(() => nextInvoiceSequenceNumber({ ...values, currentNumber: 11 }), /agotado/)
  for (const input of [{ minNumber: 0 }, { maxNumber: 9 }, { padding: 11 }, { minNumber: 10.5 }]) {
    assert.throws(() => validateInvoiceSequence({ ...values, ...input }))
  }
})

test('audit retains resource identifiers without request query values', () => {
  const id = randomUUID()
  assert.deepEqual(auditRequestTarget('DELETE', `/app/patients/${id}?token=secret&diagnosis=private`), {
    targetTable: 'patients', recordId: id, action: 'delete',
  })
  assert.equal(auditRequestTarget('POST', '/app/settings/invoice-number-sequences').targetTable, 'invoice_number_sequences')
  assert.equal(auditRequestTarget('POST', `/app/visits/${id}/consents/${randomUUID()}/print`).action, 'view')
})

test('document delivery records completion once and distinguishes failed or aborted responses', async () => {
  const original = DocumentDeliveriesService.prototype.start
  const outcomes: Array<{ completed: boolean; status: number }> = []
  DocumentDeliveriesService.prototype.start = async () => async (completed, status) => { outcomes.push({ completed, status }) }
  try {
    for (const [statusCode, finish] of [[200, true], [206, true], [416, true], [200, false]] as const) {
      const res = Object.assign(new EventEmitter(), { statusCode, writableFinished: finish, destroyed: false })
      const req = { user: { uid: randomUUID() }, ip: '127.0.0.1' }
      await trackDocumentDelivery(req as any, res as any, { documentType: 'attachment', channel: 'download' })
      if (finish) res.emit('finish')
      res.emit('close')
    }
    assert.deepEqual(outcomes, [
      { completed: true, status: 200 }, { completed: true, status: 206 },
      { completed: false, status: 416 }, { completed: false, status: 200 },
    ])
  } finally {
    DocumentDeliveriesService.prototype.start = original
  }
})
