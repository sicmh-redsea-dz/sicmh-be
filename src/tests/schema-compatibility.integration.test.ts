import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import mysql from 'mysql2/promise'
import { and, eq } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createTenantDatabase } from '../infrastructure/database/drizzle'
import { TenantContext } from '../infrastructure/database/TenantContext'
import { normalizeLocationReference, resolveInventoryLocation } from '../infrastructure/database/inventory-location'
import * as schema from '../infrastructure/database/schema/tenant'
import { MysqlPatientsRepository } from '../infrastructure/repositories/mysql-patients.repository'
import { PatientMapper } from '../domain/mappers/PatientMapper'
import { MysqlInvRepository } from '../infrastructure/repositories/mysql-inv.repository'
import { MysqlStockRepository } from '../infrastructure/repositories/mysql-stock.repository'
import { MysqlVisitsRepository } from '../infrastructure/repositories/mysql-visits.repository'
import { ClinicalDocumentsService } from '../application/services/clinical-documents.service'
import * as pdfRenderer from '../utils/pdfRenderer'
import { VisitsService } from '../application/services/visits.service'
import { InvoiceService } from '../application/services/invoice.service'
import { StockService } from '../application/services/stock.services'
import { MysqlInvoiceRepository } from '../infrastructure/repositories/mysql-invoice.repository'
import { ClinicalProfileService } from '../application/services/clinical-profile.service'
import { emptyClinicalProfile } from '../domain/entities/ClinicalProfile'
import { DrizzleExpedienteRepository } from '../infrastructure/repositories/drizzle-expediente.repository'
import { assertTenantMigrationHistory } from '../infrastructure/database/migration-history'

test('legacy location aliases resolve to stable codes without changing UUIDs', () => {
  assert.equal(normalizeLocationReference('2'), 'emergency')
  assert.equal(normalizeLocationReference('4'), 'hospitalization')
  const id = randomUUID()
  assert.equal(normalizeLocationReference(id), id)
})

test('local patient and medical-record contracts survive schema normalization', () => {
  const fixture = readFileSync('src/tests/fixtures/target-tenant-20261022.sql', 'utf8')
  const tables = new Map<string, Map<string, string>>(Array.from(fixture.matchAll(/CREATE TABLE `([^`]+)` \(([\s\S]*?)\n\) ENGINE/g),
    (match) => [match[1], new Map(Array.from(match[2].matchAll(/^  `([^`]+)` (.+?)(?:,)?$/gm),
      (column) => [column[1], column[2]]))]))
  // Explicit, additive application extension; keep the supplied target fixture unchanged.
  tables.get('patients')!.set('identification_type', "varchar(30) NOT NULL DEFAULT 'identidad'")
  tables.get('patients')!.set('notes', 'text NULL')
  tables.get('user_profiles')!.set('gender', "enum('male','female','unspecified') NULL")
  const normalize = (value: string) => value.toLowerCase().replace(/\s/g, '').replace(/^boolean$/, 'tinyint(1)')
  for (const value of Object.values(schema)) {
    const model = getTableConfig(value)
    if (!['patients', 'emergency_contacts', 'medical_records', 'user_profiles'].includes(model.name)) continue
    const columns = tables.get(model.name)
    assert.ok(columns, `Target table missing: ${model.name}`)
    assert.deepEqual(model.columns.map((c) => c.name).sort(), [...columns.keys()].sort(), model.name)
    for (const column of model.columns) {
      const ddl: string = columns.get(column.name)!
      const type: string = ddl.match(/^(\w+(?:\([^)]*\))?(?: unsigned)?)/)![0]
      assert.equal(normalize(column.getSQLType()), normalize(type), `${model.name}.${column.name} type`)
      assert.equal(column.notNull, /NOT NULL/.test(ddl), `${model.name}.${column.name} nullability`)
    }
    tables.delete(model.name)
  }

})

// Opt-in only: the dedicated disposable container is bound to loopback:33316.
// Never use application DB_HOST, credentials, company mappings, or production data.
test('target tenant schema and database workflows', {
  skip: process.env.RUN_SCHEMA_INTEGRATION_TESTS !== '1', timeout: 300_000,
}, async (t) => {
  const connection = await mysql.createConnection({ host: '127.0.0.1', port: 33316, user: 'root', password: '' })
  const suffix = randomUUID().replace(/-/g, '')
  const freshName = `medit_test_fresh_${suffix}`
  const targetName = `medit_test_target_${suffix}`
  const pools: mysql.Pool[] = []
  const poolFor = (database: string) => {
    const pool = mysql.createPool({ host: '127.0.0.1', port: 33316, user: 'root', password: '',
      database, connectionLimit: 6, dateStrings: true })
    pools.push(pool)
    return pool
  }
  const columns = async (database: string) => {
    const [rows] = await connection.query(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
      COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME <> '__drizzle_migrations' ORDER BY TABLE_NAME, COLUMN_NAME`, [database])
    return rows
  }
  const constraints = async (database: string) => {
    const [rows] = await connection.query(`SELECT k.TABLE_NAME, k.COLUMN_NAME,
      k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.UPDATE_RULE, r.DELETE_RULE
      FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      AND r.TABLE_NAME = k.TABLE_NAME WHERE k.TABLE_SCHEMA = ?
      ORDER BY k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME`, [database])
    return rows
  }
  try {
    await connection.query(`CREATE DATABASE \`${freshName}\``)
    await connection.query(`CREATE DATABASE \`${targetName}\``)
    const freshPool = poolFor(freshName)
    const targetPool = poolFor(targetName)
    const freshDb = createTenantDatabase(freshPool)
    const targetDb = createTenantDatabase(targetPool)

    await t.test('migrations recreate target column and foreign-key contracts from an empty database', async () => {
      await migrate(freshDb, { migrationsFolder: 'drizzle/tenant' })
      await assertTenantMigrationHistory(freshPool)
      const [history] = await freshPool.query<mysql.RowDataPacket[]>('SELECT id, hash FROM __drizzle_migrations ORDER BY id LIMIT 1')
      await freshPool.query('UPDATE __drizzle_migrations SET hash = ? WHERE id = ?', ['divergent-test-history', history[0].id])
      await assert.rejects(assertTenantMigrationHistory(freshPool), /Divergent tenant migration history/)
      await freshPool.query('UPDATE __drizzle_migrations SET hash = ? WHERE id = ?', [history[0].hash, history[0].id])
      await connection.query(`USE \`${targetName}\``)
      const journal = JSON.parse(readFileSync('drizzle/tenant/meta/_journal.json', 'utf8'))
      for (const entry of journal.entries) {
        const statements = readFileSync(`drizzle/tenant/${entry.tag}.sql`, 'utf8').split('--> statement-breakpoint')
        for (const statement of statements) if (statement.trim()) await connection.query(statement)
      }
      assert.deepEqual(await columns(targetName), await columns(freshName))
      assert.deepEqual(await constraints(targetName), await constraints(freshName))

    })

    await t.test('all 56 runtime models can select against the target', async () => {
      const tables = Object.values(schema).filter((value) => {
        try { getTableConfig(value as any); return true } catch { return false }
      })
      assert.equal(tables.length, 56)
      for (const table of tables) await targetDb.select().from(table as any).limit(1)
    })

    await TenantContext.run(targetPool, targetDb, async () => {
      const [role] = await targetDb.insert(schema.roles).values({ key: 'admin', name: 'Admin' }).$returningId()
      const [user] = await targetDb.insert(schema.users).values({ roleId: role.id, name: 'Test actor', email: 'actor@example.test' }).$returningId()
      const [patient] = await targetDb.insert(schema.patients).values({ firstName: 'Test', lastName: 'Patient' }).$returningId()
      const [staff] = await targetDb.insert(schema.staffMembers).values({ firstName: 'Test', lastName: 'Doctor', userId: user.id }).$returningId()
      const [visit] = await targetDb.insert(schema.clinicalEncounters).values({
        patientId: patient.id, staffMemberId: staff.id, type: 'emergency', occurredAt: new Date(),
      }).$returningId()
      for (const code of ['main', 'outpatient', 'emergency', 'operating_room', 'hospitalization']) {
        await targetDb.insert(schema.inventoryLocations).values({ code, name: code }).onDuplicateKeyUpdate({ set: { deletedAt: null } })
      }
      await t.test('clinical profile versions preserve snapshots, reject stale saves and roll back atomically', async () => {
        const service = new ClinicalProfileService()
        assert.equal((await service.get(patient.id)).version, 0)
        const data = { ...emptyClinicalProfile(), pathologicalHst: 'Diabetes', allergyStatus: 'none_known' as const }
        const makeEncounter = async () => (await targetDb.insert(schema.clinicalEncounters).values({
          patientId: patient.id, staffMemberId: staff.id, type: 'outpatient', occurredAt: new Date(),
        }).$returningId())[0].id
        const firstId = await makeEncounter()
        await TenantContext.transaction(() => service.review(patient.id, firstId, { version: 0, data }, user.id))
        assert.equal((await service.get(patient.id)).version, 1)
        const unchangedId = await makeEncounter()
        await TenantContext.transaction(() => service.review(patient.id, unchangedId, { version: 1, data }, user.id))
        assert.equal((await service.get(patient.id)).version, 1, 'review without changes reuses version')
        const changedId = await makeEncounter()
        const changed = { ...data, currentMeds: 'Metformina' }
        await TenantContext.transaction(() => service.review(patient.id, changedId, { version: 1, data: changed }, user.id))
        assert.equal((await service.get(patient.id)).version, 2)
        assert.equal((await service.snapshot(firstId))!.data.currentMeds, '')
        assert.equal((await service.snapshot(changedId))!.data.currentMeds, 'Metformina')
        const staleId = await makeEncounter()
        await assert.rejects(TenantContext.transaction(() => service.review(patient.id, staleId, { version: 1, data }, user.id)), /otra sesion/)
        assert.equal(await service.snapshot(staleId), null)
        await assert.rejects(TenantContext.transaction(async () => {
          await service.review(patient.id, staleId, { version: 2, data }, user.id)
          throw new Error('Simulated encounter failure')
        }), /Simulated/)
        assert.equal((await service.get(patient.id)).version, 2)
        assert.equal(await service.snapshot(staleId), null)
        const raceA = await makeEncounter(), raceB = await makeEncounter()
        const race = await Promise.allSettled([
          TenantContext.transaction(() => service.review(patient.id, raceA, { version: 2, data: { ...changed, currentMeds: 'A' } }, user.id)),
          TenantContext.transaction(() => service.review(patient.id, raceB, { version: 2, data: { ...changed, currentMeds: 'B' } }, user.id)),
        ])
        assert.equal(race.filter(result => result.status === 'fulfilled').length, 1)
        assert.equal((await service.get(patient.id)).version, 3)
      })

      await t.test('patient document type, notes and emergency contact survive create/edit/reopen', async () => {
        const repo = new MysqlPatientsRepository()
        const contact = { name: 'Emergency Person', relationship: 'Sibling', phone: '99999999',
          email: 'contact@example.test', address: 'Contact address' }
        const id = await repo.create({ firstName: 'Passport', lastName: 'Patient', birthdate: '2000-10-24',
          gender: 'other', address: '', email: '', phone: '', id: 'AB1234567', identificationType: 'pasaporte',
          notes: 'Patient notes', emergencyContact: contact })
        const first = PatientMapper.toPatientsResponse((await repo.findById(id))!)
        assert.equal(first.identificationType, 'pasaporte')
        assert.equal(first.notes, 'Patient notes')
        assert.deepEqual(first.emergencyContact, { ...contact, id: first.emergencyContact!.id })
        await repo.update(id, { notes: 'Updated notes' })
        assert.equal((await repo.findById(id))!.emergencyContact!.id, first.emergencyContact!.id)
        await repo.update(id, { emergencyContact: { ...contact, phone: '88888888' } })
        const updated = (await repo.findById(id))!
        assert.equal(updated.emergencyContact!.phone, '88888888')
        assert.equal(updated.emergencyContact!.id, first.emergencyContact!.id)
        const rows = await targetDb.select().from(schema.emergencyContacts).where(eq(schema.emergencyContacts.patientId, id))
        assert.equal(rows.length, 1, 'editing must not duplicate contact rows')
        const search = await new MysqlVisitsRepository().findPatients('AB1234567')
        assert.equal(search[0].birthDate, '2000-10-24')
        await repo.update(id, { emergencyContact: null })
        assert.equal((await repo.findById(id))!.emergencyContact, null)
        await assert.rejects(() => repo.create({ firstName: 'Rollback', lastName: 'Patient', birthdate: '2000-01-01',
          gender: 'other', phone: '', email: '', address: '', id: 'ROLLBACK1', identificationType: 'pasaporte',
          emergencyContact: { name: 'X'.repeat(151) } as any }))
        const rolledBack = await targetDb.select().from(schema.patients).where(eq(schema.patients.identification, 'ROLLBACK1'))
        assert.equal(rolledBack.length, 0)
      })
      await t.test('encounter notes, all histories and all vital signs survive create/edit/reopen', async () => {
        const repo = new MysqlVisitsRepository()
        const values = { PacienteID: patient.id, PersonalID: staff.id, TipoVisita: 'Consulta',
          Diagnostico: 'Diagnosis', Tratamiento: 'Treatment', Notas: 'Notes', Ant_Familiar: 'Family', Ant_Habito: 'Habits',
          Ant_Patologico: 'Pathological', Ant_Quirurgico: 'Surgical', Presion: '120/80', Oxigenacion: 98,
          Temperatura: '36.5', Glucometria: '95', Peso: '70', Altura: '170', IMC: '24.22',
          PorcentajeGrasa: '20', GrasaVisceral: '5', EdadSegunPeso: '30' }
        const id = await repo.create(values)
        for (const data of [values, { ...values, Notas: 'Edited notes', Ant_Familiar: 'Edited family', Peso: '71' }]) {
          await repo.update(id, data)
          const reopened = (await repo.findById(id))!
          for (const [key, value] of Object.entries(data)) {
            if (key === 'TipoVisita') continue
            const stored = (reopened as any)[key]
            if (['Temperatura', 'Glucometria', 'Peso', 'Altura', 'IMC', 'PorcentajeGrasa', 'GrasaVisceral', 'EdadSegunPeso'].includes(key))
              assert.equal(Number(stored), Number(value), key)
            else assert.equal(stored, value, key)
          }
        }
      })
      await t.test('every clinical form field roundtrips through the renamed medical_records columns', async () => {
        const repo = new DrizzleExpedienteRepository()
        const standard = { chiefComplaint: 'Complaint', currentIllness: 'Illness', physicalExam: 'Exam', allergies: 'Allergy', currentMeds: 'Medication' }
        const module = { followUpPlan: 'Follow up', referrals: 'Referral', triageLevel: 'III', arrivalMode: 'Walking',
          painScale: 0, glasgow: 15, disposition: 'Home', injuryMechanism: 'Fall', preOpDiagnosis: 'Pre',
          postOpDiagnosis: 'Post', procedure: 'Procedure', anesthesiaType: 'General', surgeryStart: '2026-10-24T08:00:00.000Z',
          surgeryEnd: '2026-10-25T09:30:00.000Z', findings: 'Findings', complications: 'None', admissionDiagnosis: 'Admission',
          admissionReason: 'Observation', service: 'Medicine', bed: 'A-1', evolutionSummary: 'Evolution', dischargePlan: 'Discharge',
          dischargeDate: '2026-10-26T00:00:00.000Z' }
        await repo.upsert(visit.id, { historyId: visit.id, patientId: patient.id, origin: 'emergency', standard, module,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        const saved = (await repo.findByHistoryId(visit.id))!
        assert.deepEqual(saved.standard, standard)
        assert.deepEqual(saved.module, module)
        await repo.upsert(visit.id, { ...saved, module: { ...module, surgeryStart: '', surgeryEnd: '', dischargeDate: '' } })
        const cleared = (await repo.findByHistoryId(visit.id))!
        assert.equal(cleared.module.surgeryStart, undefined)
        assert.equal(cleared.module.surgeryEnd, undefined)
        assert.equal(cleared.module.dischargeDate, undefined)
      })
      const inventory = new MysqlInvRepository()
      const stock = new MysqlStockRepository()
      const expedienteRepo = new DrizzleExpedienteRepository()
      const careService = new VisitsService({} as any, {} as any, new StockService(stock),
        new InvoiceService({} as any, new MysqlInvoiceRepository()),
        { getDefaultConsultaService: async () => ({ id: randomUUID(), name: 'Consulta', price: 0 }) } as any,
        new MysqlVisitsRepository(), expedienteRepo)
      // This test targets clinical persistence; no background billing trail or external services.
      ;(careService as any).recordBillingTrail = async () => {}

      await t.test('visit stock edits use the original location, serialize deltas and block paid-invoice changes', async () => {
        const [product] = await targetDb.insert(schema.products).values({ name: 'Scoped consumable', unitPrice: '10.00' }).$returningId()
        const [main] = await targetDb.select().from(schema.inventoryLocations).where(eq(schema.inventoryLocations.code, 'main'))
        const [emergency] = await targetDb.select().from(schema.inventoryLocations).where(eq(schema.inventoryLocations.code, 'emergency'))
        await targetDb.insert(schema.inventoryStock).values([
          { productId: product.id, locationId: main.id, quantity: 10 },
          { productId: product.id, locationId: emergency.id, quantity: 5 },
        ])
        const available = async (locationId: string) => (await targetDb.select().from(schema.inventoryStock)
          .where(and(eq(schema.inventoryStock.productId, product.id), eq(schema.inventoryStock.locationId, locationId))))[0].quantity
        const created = await careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'emergency',
          stockItems: [{ id: product.id, qty: 2, subinventoryId: 'main' }] })
        assert.equal(await available(main.id), 10, 'client cannot redirect clinical consumption to main')
        assert.equal(await available(emergency.id), 3)
        await careService.editVisit({ id: created.visit, body: { stockItems: [] } })
        assert.equal(await available(emergency.id), 5, 'removed items return to emergency')
        assert.equal(await available(main.id), 10)
        await Promise.all([2, 2].map(qty => careService.editVisit({ id: created.visit,
          body: { stockItems: [{ id: product.id, qty, subinventoryId: 'main' }] } })))
        assert.equal(await available(emergency.id), 3, 'two identical concurrent edits consume once')
        const encounter = (await targetDb.select().from(schema.clinicalEncounters).where(eq(schema.clinicalEncounters.id, created.visit)))[0]
        const items = await stock.findByInvoiceId(encounter.invoiceId!)
        assert.equal(items.length, 1)
        assert.equal(items[0].qty, 2, 'signed correction lines are netted')
        const originalUpsert = expedienteRepo.upsert
        expedienteRepo.upsert = async () => { throw new Error('Simulated edit failure') }
        try {
          await assert.rejects(careService.editVisit({ id: created.visit, body: { notes: 'Must roll back',
            expediente: { standard: { chiefComplaint: 'Test' } } } }))
          const reopened = await careService.findVisitById(created.visit)
          assert.notEqual(reopened.visit.notes, 'Must roll back')
          assert.deepEqual(reopened.stock, [], 'visit details do not disclose global inventory')
        } finally { expedienteRepo.upsert = originalUpsert }
        await targetDb.update(schema.invoices).set({ status: 'Pagado' }).where(eq(schema.invoices.id, encounter.invoiceId!))
        await assert.rejects(careService.editVisit({ id: created.visit, body: { stockItems: [] } }))
        assert.equal(await available(emergency.id), 3)
      })
      await t.test('concurrent payment locks the invoice and payment errors roll back its status', async () => {
        const repo = new MysqlInvoiceRepository()
        const invoiceService = new InvoiceService({} as any, repo)
        const created = await careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'emergency' })
        const visitRow = (await targetDb.select().from(schema.clinicalEncounters).where(eq(schema.clinicalEncounters.id, created.visit)))[0]
        const invoice = (await repo.findById(visitRow.invoiceId!))!
        const failedPayment = new InvoiceService({} as any, repo, { updateEncounterStatusByInvoice: async () => { throw new Error('Simulated payment trail failure') } } as any)
        await assert.rejects(failedPayment.updateInvById(String(invoice.InvoiceNumber), {}))
        assert.equal((await repo.findById(visitRow.invoiceId!))!.Estado, 'Pendiente')
        const results = await Promise.allSettled([invoiceService.updateInvById(String(invoice.InvoiceNumber), {}),
          invoiceService.updateInvById(String(invoice.InvoiceNumber), {})])
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
        assert.equal(results.filter(result => result.status === 'rejected').length, 1)
        assert.equal((await repo.findById(visitRow.invoiceId!))!.Estado, 'Pagado')
      })
      await t.test('missing default consultation service cannot silently create an uncharged visit', async () => {
        const billing = (careService as any).billingService
        const original = billing.getDefaultConsultaService
        const before = (await targetDb.select().from(schema.invoices)).length
        billing.getDefaultConsultaService = async () => null
        try {
          await assert.rejects(careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'visits' }))
          assert.equal((await targetDb.select().from(schema.invoices)).length, before)
        } finally { billing.getDefaultConsultaService = original }
      })
      await t.test('each care module creates and edits a minimal visit with automatic invoice/visit dates', async () => {
        for (const origin of ['visits', 'emergency', 'oroom', 'hospitalization']) {
          const created = await careService.createVisit({ doctor: staff.id, patient: patient.id, origin })
          const [encounter] = await targetDb.select().from(schema.clinicalEncounters)
            .where(eq(schema.clinicalEncounters.id, created.visit))
          const [invoice] = await targetDb.select().from(schema.invoices).where(eq(schema.invoices.id, encounter.invoiceId!))
          assert.ok(Math.abs(encounter.occurredAt.getTime() - Date.now()) < 60_000)
          assert.equal(invoice.issuedAt.getTime(), encounter.occurredAt.getTime())
          assert.equal(await expedienteRepo.findByHistoryId(created.visit), null)
          await careService.editVisit({ id: created.visit, body: { notes: 'Follow up' } })
          const [updated] = await targetDb.select().from(schema.clinicalEncounters)
            .where(eq(schema.clinicalEncounters.id, created.visit))
          assert.equal(updated.patientId, patient.id)
          assert.equal(updated.staffMemberId, staff.id)
          assert.equal(updated.notes, 'Follow up')
        }
      })

      await t.test('outpatient saves snapshot the reviewed profile and later edits cannot rewrite it', async () => {
        const profileService = new ClinicalProfileService()
        const current = await profileService.get(patient.id)
        const data = { ...current.data, pathologicalHst: 'Persistent condition', allergyStatus: 'recorded' as const, allergies: 'Penicilina', currentMeds: 'Habitual medication' }
        const created = await careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'visits',
          pathologicalHst: 'Stale form value',
          expediente: { standard: { chiefComplaint: 'Follow up', physicalExam: 'Stable' } },
          clinicalProfileReview: { version: current.version, data } }, user.id)
        const reopened = (await careService.findVisitById(created.visit)).visit
        assert.equal(reopened.pathologicalHst, data.pathologicalHst)
        assert.equal(reopened.expediente.standard.allergies, 'Penicilina')
        assert.equal(reopened.clinicalProfileSnapshot.reviewedBy, user.id)
        assert.equal(reopened.clinicalProfileSnapshot.data.currentMeds, 'Habitual medication')
        await careService.editVisit({ id: created.visit, body: { notes: 'Updated consultation', pathologicalHst: 'Overwrite attempt',
          expediente: { standard: { allergies: 'Overwrite attempt' } } } })
        const edited = (await careService.findVisitById(created.visit)).visit
        assert.equal(edited.notes, 'Updated consultation')
        assert.equal(edited.pathologicalHst, data.pathologicalHst)
        assert.equal(edited.expediente.standard.allergies, 'Penicilina')
        await assert.rejects(careService.editVisit({ id: created.visit, body: { patient: randomUUID() } }))
        const before = (await targetDb.select().from(schema.invoices)).length
        await assert.rejects(careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'visits',
          clinicalProfileReview: { version: current.version, data } }, user.id), /otra sesion/)
        assert.equal((await targetDb.select().from(schema.invoices)).length, before, 'stale review rolls back invoice creation too')
      })

      await t.test('partial clinical records satisfy the target without requiring blank clinical fields', async () => {
        const created = await careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'emergency',
          diagnosis: 'Known diagnosis', weight: 65,
          expediente: { module: { triageLevel: 'III' } } })
        const record = await expedienteRepo.findByHistoryId(created.visit)
        assert.equal(record?.module.triageLevel, 'III')
        assert.equal(record?.standard.chiefComplaint, '')
        await careService.editVisit({ id: created.visit, body: { expediente: { standard: { currentIllness: 'History' } } } })
        const updated = await expedienteRepo.findByHistoryId(created.visit)
        assert.equal(updated?.module.triageLevel, 'III')
        assert.equal(updated?.standard.currentIllness, 'History')
        const [encounter] = await targetDb.select().from(schema.clinicalEncounters)
          .where(eq(schema.clinicalEncounters.id, created.visit))
        const [vitals] = await targetDb.select().from(schema.encounterVitals)
          .where(eq(schema.encounterVitals.clinicalEncounterId, created.visit))
        assert.equal(encounter.diagnosis, 'Known diagnosis')
        assert.equal(Number(vitals.weight), 65)
      })

      await t.test('a clinical-record failure rolls back invoice and visit creation together', async () => {
        const before = (await targetDb.select().from(schema.clinicalEncounters)).length
        const beforeInvoices = (await targetDb.select().from(schema.invoices)).length
        const original = expedienteRepo.upsert
        expedienteRepo.upsert = async () => { throw new Error('Simulated clinical-record failure') }
        try {
          await assert.rejects(careService.createVisit({ doctor: staff.id, patient: patient.id, origin: 'oroom',
            expediente: { module: { procedure: 'Procedure' } } }), /Simulated clinical-record failure/)
        } finally {
          expedienteRepo.upsert = original
        }
        assert.equal((await targetDb.select().from(schema.clinicalEncounters)).length, before)
        assert.equal((await targetDb.select().from(schema.invoices)).length, beforeInvoices)
      })
      let productId: string
      const quantities = async (id: string) => {
        const rows = await targetDb.select({ code: schema.inventoryLocations.code, qty: schema.inventoryStock.quantity })
          .from(schema.inventoryStock).innerJoin(schema.inventoryLocations, eq(schema.inventoryStock.locationId, schema.inventoryLocations.id))
          .where(eq(schema.inventoryStock.productId, id))
        return Object.fromEntries(rows.map((r) => [r.code, r.qty]))
      }

      await t.test('inventory CRUD preserves UUIDs, zero stock, and minimum-stock DTOs', async () => {
        productId = await inventory.create({ NombreProducto: 'Gauze', PrecioUnidad: 2.5, Cantidad: 10, NivelMinimoStock: 3, PrecioCompra: 1.25, FechaVencimiento: '2028-02-29' })
        assert.match(productId, /^[0-9a-f-]{36}$/)
        assert.equal((await inventory.findById(productId)).NivelMinimoStock, 3)
        assert.equal((await inventory.findById(productId)).PrecioCompra, '1.25')
        assert.equal((await inventory.findById(productId)).FechaVencimiento, '2028-02-29')
        await assert.rejects(inventory.update(productId, { prodPurchasePrice: -1 }))
        await assert.rejects(inventory.update(productId, { prodExpirationDate: '2027-02-29' }))
        await inventory.update(productId, { prodPurchasePrice: 0, prodExpirationDate: null })
        assert.equal((await inventory.findById(productId)).PrecioCompra, '0.00')
        assert.equal((await inventory.findById(productId)).FechaVencimiento, null)
        await inventory.update(productId, { prodName: 'Gauze', prodUnitPrice: 2.5, prodQty: 0, prodMinStock: 3 })
        const rows = await inventory.findAll({ limit: 25, offset: 0, term: 'Gauze' }, 'main')
        assert.equal(rows[0].Cantidad, 0)
        await inventory.update(productId, { prodName: 'Gauze', prodUnitPrice: 2.5, prodQty: 10, prodMinStock: 3 })
      })

      await t.test('subinventories list only positive local balances with filtered pagination totals', async () => {
        const localProductId = await inventory.create({ NombreProducto: 'Subinventory scope test', Cantidad: 2 })
        const page = { limit: 25, offset: 0, term: 'Subinventory scope test' }
        assert.deepEqual(await inventory.findAll(page, 'hospitalization'), [])
        const destination = await resolveInventoryLocation('hospitalization')
        await inventory.transfer({ prodId: localProductId, prodQty: 2, fromLocId: 'main', toLocId: destination, actorId: user.id })
        for (const reference of ['hospitalization', '4', destination]) {
          const rows = await inventory.findAll(page, reference)
          assert.equal(rows.length, 1)
          assert.equal(rows[0].ProductoID, localProductId)
          assert.equal(rows[0].Cantidad, 2)
          assert.equal(rows[0].total_registries, 1)
        }
        await inventory.transfer({ prodId: localProductId, prodQty: 2, fromLocId: destination, toLocId: 'main', actorId: user.id })
        assert.deepEqual(await inventory.findAll(page, destination), [])
      })

      await t.test('transfers use UUID locations, audit movement, and reject invalid amounts without partial writes', async () => {
        const destination = await resolveInventoryLocation('emergency')
        await inventory.transfer({ prodId: productId, prodQty: 4, fromLocId: 'main', toLocId: destination, actorId: user.id })
        assert.deepEqual(await quantities(productId), { main: 6, emergency: 4 })
        const [movement] = await targetDb.select().from(schema.stockMovements)
          .where(and(eq(schema.stockMovements.productId, productId), eq(schema.stockMovements.type, 'transfer')))
        assert.equal(movement.actorId, user.id)
        assert.equal(movement.toLocationId, destination)
        for (const qty of [0, -1, 0.5, 99]) await assert.rejects(inventory.transfer({
          prodId: productId, prodQty: qty, fromLocId: 'main', toLocId: 'emergency',
        }))
        await assert.rejects(inventory.transfer({ prodId: productId, prodQty: 1, fromLocId: '1', toLocId: 'main' }))
        assert.deepEqual(await quantities(productId), { main: 6, emergency: 4 })
      })

      await t.test('visit stock lookup and consumption support codes and older numeric location aliases', async () => {
        const visits = new MysqlVisitsRepository()
        assert.equal((await visits.findStockItems('emergency')).find(item => item.ProductoID === productId)!.Cantidad, 4)
        assert.equal((await visits.findStockItems('2')).find(item => item.ProductoID === productId)!.ProductoID, productId)
        await assert.rejects(stock.reduceStockQuantities([
          { id: productId, qty: 99, subinventoryId: 'emergency' },
        ]), (error: any) => error.name === 'validation_errors' && /insufficient stock|existencias insuficientes/i.test(error.errors[0].msg))
        await stock.reduceStockQuantities([{ id: productId, qty: 1, subinventoryId: 'emergency' }])
        assert.equal((await quantities(productId)).emergency, 3)
        await stock.restoreStockQuantities([{ id: productId, qty: 1, subinventoryId: '2' }])
        assert.equal((await quantities(productId)).emergency, 4)
      })

      await t.test('nested repository writes and stock changes roll back with the outer visit transaction', async () => {
        let rolledBackId = ''
        await assert.rejects(TenantContext.transaction(async () => {
          rolledBackId = await inventory.create({ NombreProducto: 'Rollback test', PrecioUnidad: 1, Cantidad: 3, NivelMinimoStock: 0 })
          await stock.reduceStockQuantities([{ id: productId, qty: 1, subinventoryId: 'emergency' }])
          throw new Error('simulate a later visit failure')
        }), /later visit failure/)
        assert.equal(await inventory.findById(rolledBackId), null)
        assert.equal((await quantities(productId)).emergency, 4)
      })

      await t.test('concurrent transfers cannot overdraw origin stock', async () => {
        const id = await inventory.create({ NombreProducto: 'Concurrent test', PrecioUnidad: 1, Cantidad: 5, NivelMinimoStock: 0 })
        const results = await Promise.allSettled(['emergency', 'operating_room'].map((toLocId) =>
          inventory.transfer({ prodId: id, prodQty: 4, fromLocId: 'main', toLocId })))
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
        const values = Object.values(await quantities(id))
        assert.equal(values.reduce((a, b) => a + b, 0), 5)
        assert.ok(values.every((value) => value >= 0))
      })

      const attachments = {
        upload: async (args: any) => {
          const [created] = await TenantContext.getDb().insert(schema.clinicalAttachments).values({
            patientId: args.patientId, clinicalEncounterId: args.recordId, label: args.label,
            source: 'file_upload', objectPath: `test/${randomUUID()}.pdf`, mimeType: 'application/pdf',
            sizeBytes: args.buffer.length, uploadedBy: args.uploadedBy,
          }).$returningId()
          return { id: created.id }
        },
      }
      const service = new ClinicalDocumentsService(attachments as any, {} as any)
      let template: Awaited<ReturnType<typeof service.createTemplate>>
      await t.test('consent templates persist actor IDs and serialize concurrent version changes', async () => {
        template = await service.createTemplate('Consent', 'Original content', user.id)
        await Promise.all([
          service.updateTemplate(template.id, 'Consent', 'Second content', user.id),
          service.updateTemplate(template.id, 'Consent', 'Third content', user.id),
        ])
        const versions = await targetDb.select().from(schema.consentTemplateVersions).orderBy(schema.consentTemplateVersions.version)
        assert.deepEqual(versions.map((v) => v.version), [1, 2, 3])
        assert.ok(versions.every((v) => v.createdBy === user.id))
        template = (await service.listTemplates())[0]
        assert.equal(template.current_version, 3)
        assert.ok(template.version_id)
      })

      // PDF rendering and object storage are stubbed; schema writes and reads are real MySQL.
      const originalRender = pdfRenderer.renderPdfFromHtml
      ;(pdfRenderer as any).renderPdfFromHtml = async () => Buffer.from('%PDF-1.4 test')
      ;(service as any).getVisitContext = async () => ({ visitId: visit.id, patientId: patient.id,
        doctorId: staff.id, patientName: 'Test Patient', doctorName: 'Test Doctor', patientAge: 30,
        patientPhone: null, patientIdentification: null, clinicName: 'Test', logoUrl: '',
        hasDoctorSignature: true, hasDoctorStamp: true, signatureUrl: null, stampUrl: null,
        template, visitDate: new Date().toISOString() })
      try {
        await t.test('consent acceptance stores version UUID, snapshot, actor, and hash; reprint preserves acceptance', async () => {
          const accepted = await service.acceptVisit(visit.id, template.id, {
            signerType: 'patient', signerName: 'Test Patient', expectedTemplateVersion: 3,
          }, 'TEST', user.id)
          await service.printVisit(visit.id, template.id, 3, 'TEST', user.id)
          const instances = await service.listVisitConsents(visit.id)
          assert.equal(instances.length, 2)
          assert.equal(instances.find((i) => i.id === accepted.id)?.status, 'accepted')
          const [row] = await targetDb.select().from(schema.consentInstances).where(eq(schema.consentInstances.id, accepted.id))
          assert.equal(row.templateVersionId, template.version_id)
          assert.equal(row.createdBy, user.id)
          assert.equal(row.acceptedBy, user.id)
          assert.equal(row.snapshot?.patientId, patient.id)
          assert.equal(row.documentSha256?.length, 64)
          await assert.rejects(service.printVisit(visit.id, template.id, 2, 'TEST', user.id))
        })

        await t.test('physical acceptance preserves printed snapshot and rejects replacing an accepted document', async () => {
          const printed = (await service.listVisitConsents(visit.id)).find((i) => i.status === 'printed')!
          const file = { buffer: Buffer.from('%PDF signed'), originalName: 'signed.pdf', mimeType: 'application/pdf' }
          const results = await Promise.allSettled([
            service.uploadPhysical(visit.id, printed.id, file, 'TEST', user.id),
            service.uploadPhysical(visit.id, printed.id, file, 'TEST', user.id),
          ])
          assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
          const [row] = await targetDb.select().from(schema.consentInstances).where(eq(schema.consentInstances.id, printed.id))
          assert.equal(row.acceptanceMethod, 'physical')
          assert.equal(row.acceptedBy, user.id)
          assert.equal(row.snapshot?.patientId, patient.id)
        })
      } finally {
        ;(pdfRenderer as any).renderPdfFromHtml = originalRender
      }
    })
  } finally {
    for (const pool of pools) await pool.end()
    // Only the two uniquely named schemas created above are removed.
    await connection.query(`DROP DATABASE IF EXISTS \`${freshName}\``)
    await connection.query(`DROP DATABASE IF EXISTS \`${targetName}\``)
    await connection.end()
  }
})
