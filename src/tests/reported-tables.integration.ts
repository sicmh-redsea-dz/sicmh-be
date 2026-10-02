import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import mysql from 'mysql2/promise'
import { eq, inArray } from 'drizzle-orm'
import { createTenantDatabase } from '../infrastructure/database/drizzle'
import { TenantContext } from '../infrastructure/database/TenantContext'
import * as schema from '../infrastructure/database/schema/tenant'
import { MysqlAuthRepository } from '../infrastructure/repositories/mysql-auth.repository'
import { MysqlInvoiceRepository } from '../infrastructure/repositories/mysql-invoice.repository'
import { MysqlVisitsRepository } from '../infrastructure/repositories/mysql-visits.repository'
import { ClinicalDocumentsService } from '../application/services/clinical-documents.service'
import { InvoiceNumberSequencesService } from '../application/services/invoice-number-sequences.service'
import { DocumentDeliveriesService } from '../application/services/document-deliveries.service'
import { hashResetToken } from '../utils/jwtUtils'

test('reported tables on local MySQL', { skip: process.env.RUN_MYSQL_INTEGRATION !== '1' }, async (t) => {
  assert.ok(['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? ''), 'Integration tests require local MySQL')
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_TENANT_SCHEMA, connectionLimit: 5,
  })
  const db = createTenantDatabase(pool)
  const run = <T>(fn: () => Promise<T>) => TenantContext.run(pool, db, fn)
  const ids = { role: randomUUID(), user: randomUUID(), patient: randomUUID(), staff: randomUUID() }
  const templates: string[] = []
  const series: string[] = []
  try {
    await t.test('actual schema matches the migration snapshot', async () => {
      const snapshot = JSON.parse(readFileSync('drizzle/tenant/meta/0003_snapshot.json', 'utf8'))
      const [columns] = await pool.query<mysql.RowDataPacket[]>('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE()')
      const [constraints] = await pool.query<mysql.RowDataPacket[]>('SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()')
      for (const [name, table] of Object.entries(snapshot.tables) as Array<[string, any]>) {
        assert.deepEqual(columns.filter(row => row.TABLE_NAME === name).map(row => row.COLUMN_NAME).sort(), Object.keys(table.columns).sort(), name)
        for (const key of [...Object.keys(table.foreignKeys), ...Object.keys(table.checkConstraint)]) assert.ok(constraints.some(row => row.TABLE_NAME === name && row.CONSTRAINT_NAME === key), key)
      }
    })
    await db.insert(schema.roles).values({ id: ids.role, name: ids.role, key: ids.role })
    await db.insert(schema.users).values({ id: ids.user, roleId: ids.role, name: 'Integration fixture', email: `${ids.user}@example.invalid`, passwordHash: 'before' })
    await db.insert(schema.patients).values({ id: ids.patient, firstName: 'Integration', lastName: 'Fixture' })
    await db.insert(schema.staffMembers).values({ id: ids.staff, firstName: 'Integration', lastName: 'Fixture' })

    await t.test('password reset is atomic, single use, revocable and expiring', async () => {
      const repo = new MysqlAuthRepository()
      const first = hashResetToken(randomUUID()), second = hashResetToken(randomUUID())
      await run(() => repo.storePasswordResetToken(ids.user, first, new Date(Date.now() + 60000)))
      await run(() => repo.storePasswordResetToken(ids.user, second, new Date(Date.now() + 60000)))
      assert.equal(await run(() => repo.resetPasswordWithToken(ids.user, 0, first, 'revoked')), false)
      const results = await Promise.all([
        run(() => repo.resetPasswordWithToken(ids.user, 0, second, 'after')),
        run(() => repo.resetPasswordWithToken(ids.user, 0, second, 'after')),
      ])
      assert.deepEqual(results.sort(), [false, true])
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, ids.user))
      assert.equal(user.sessionVersion, 1)
      assert.equal(user.passwordHash, 'after')
      const expired = hashResetToken(randomUUID())
      await run(() => repo.storePasswordResetToken(ids.user, expired, new Date(Date.now() - 60000)))
      assert.equal(await run(() => repo.resetPasswordWithToken(ids.user, 1, expired, 'expired')), false)
    })

    await t.test('SAR allocates unique numbers concurrently and rolls back failed invoices', async (subtest) => {
      const active = await db.select().from(schema.invoiceNumberSequences).where(eq(schema.invoiceNumberSequences.activeKey, 'sar'))
      if (active.length) { subtest.skip('A configured SAR series exists; leaving it untouched'); return }
      const sequences = new InvoiceNumberSequencesService()
      const prefix = `TEST-${ids.patient.slice(0, 8)}-`
      const sequence = await run(() => sequences.create({ code: ids.patient, prefix, cai: 'TEST-ONLY', minNumber: 1, maxNumber: 3, padding: 2 }))
      series.push(sequence.id)
      const repo = new MysqlInvoiceRepository()
      const invoice = (number: string) => ({ InvoiceNumber: number, PacienteID: ids.patient, PersonalID: ids.staff, Monto: 1 })
      const internalNumber = randomUUID()
      await run(() => repo.create(invoice(internalNumber)))
      await assert.rejects(run(() => repo.create(invoice(internalNumber))))
      const [afterFailure] = await db.select().from(schema.invoiceNumberSequences).where(eq(schema.invoiceNumberSequences.id, sequence.id))
      assert.equal(afterFailure.currentNumber, 1)
      await Promise.all([run(() => repo.create(invoice(randomUUID()))), run(() => repo.create(invoice(randomUUID())))])
      const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.numberSequenceId, sequence.id))
      assert.deepEqual(rows.map(row => row.sarNumber).sort(), [`${prefix}01`, `${prefix}02`, `${prefix}03`])
      await assert.rejects(run(() => repo.create(invoice(randomUUID()))), /agotado/)
      await assert.rejects(run(() => sequences.create({ code: randomUUID(), prefix, cai: 'TEST-ONLY', minNumber: 2, maxNumber: 8 })), /superpone/)
    })

    await t.test('consent versions are serialized and invalid historical versions are rejected', async () => {
      const service = new ClinicalDocumentsService({} as any, {} as any)
      const template = await run(() => service.createTemplate(`TEST-${ids.patient}`, 'v1'))
      templates.push(template.id)
      await Promise.all([
        run(() => service.updateTemplate(template.id, template.name, 'v2')),
        run(() => service.updateTemplate(template.id, template.name, 'v3')),
      ])
      const versions = await db.select().from(schema.consentTemplateVersions).where(eq(schema.consentTemplateVersions.templateId, template.id))
      assert.deepEqual(versions.map(row => row.version).sort(), [1, 2, 3])
      const [encounter] = await db.insert(schema.clinicalEncounters).values({ patientId: ids.patient, staffMemberId: ids.staff, type: 'outpatient', occurredAt: new Date() }).$returningId()
      const instance = { templateId: template.id, patientId: ids.patient, staffMemberId: ids.staff, clinicalEncounterId: encounter.id, status: 'printed' as const }
      await assert.rejects(db.insert(schema.consentInstances).values({ ...instance, templateVersion: 99 }))
      await db.insert(schema.consentInstances).values({ ...instance, templateVersion: 1 })
      const linked = await db.query.consentInstances.findFirst({ where: eq(schema.consentInstances.clinicalEncounterId, encounter.id), with: { version: true } })
      assert.equal(linked?.version.content, 'v1')
      await run(() => new MysqlVisitsRepository().softDelete(encounter.id))
      assert.equal(await run(() => new MysqlVisitsRepository().findById(encounter.id)), null)
    })

    await t.test('document outcomes persist and audit rows accept UUID actors', async () => {
      const complete = await run(() => new DocumentDeliveriesService().start({ actorId: ids.user, documentType: 'invoice_report', channel: 'download' }))
      await complete(true, 200)
      const [delivery] = await db.select().from(schema.documentDeliveries).where(eq(schema.documentDeliveries.actorId, ids.user))
      assert.equal(delivery.status, 'completed')
      assert.ok(delivery.completedAt)
      await db.insert(schema.auditLogs).values({ actorId: ids.user, action: 'view', targetTable: 'document_deliveries', recordId: delivery.id, occurredAt: new Date() })
      const [audit] = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.actorId, ids.user))
      assert.equal(audit.recordId, delivery.id)
    })
  } finally {
    // Delete only UUID-scoped fixtures created by this run; never reset a database.
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.actorId, ids.user))
    await db.delete(schema.documentDeliveries).where(eq(schema.documentDeliveries.actorId, ids.user))
    if (templates.length) await db.delete(schema.consentInstances).where(inArray(schema.consentInstances.templateId, templates))
    if (templates.length) {
      await db.delete(schema.consentTemplateVersions).where(inArray(schema.consentTemplateVersions.templateId, templates))
      await db.delete(schema.consentTemplates).where(inArray(schema.consentTemplates.id, templates))
    }
    await db.delete(schema.clinicalEncounters).where(eq(schema.clinicalEncounters.patientId, ids.patient))
    await db.delete(schema.invoices).where(eq(schema.invoices.patientId, ids.patient))
    if (series.length) await db.delete(schema.invoiceNumberSequences).where(inArray(schema.invoiceNumberSequences.id, series))
    await db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, ids.user))
    await db.delete(schema.users).where(eq(schema.users.id, ids.user))
    await db.delete(schema.roles).where(eq(schema.roles.id, ids.role))
    await db.delete(schema.staffMembers).where(eq(schema.staffMembers.id, ids.staff))
    await db.delete(schema.patients).where(eq(schema.patients.id, ids.patient))
    await pool.end()
  }
})
