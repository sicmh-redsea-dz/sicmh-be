import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import mysql from 'mysql2/promise'
import { and, eq, inArray, isNull, sum } from 'drizzle-orm'
import { createTenantDatabase } from '../infrastructure/database/drizzle'
import { TenantContext } from '../infrastructure/database/TenantContext'
import * as s from '../infrastructure/database/schema/tenant'
import { MysqlInvRepository } from '../infrastructure/repositories/mysql-inv.repository'
import { MysqlStockRepository } from '../infrastructure/repositories/mysql-stock.repository'
import { MysqlInvoiceRepository } from '../infrastructure/repositories/mysql-invoice.repository'
import { DrizzlePatientMovementsRepository } from '../infrastructure/repositories/drizzle-patient-movements.repository'
import { DrizzlePatientEncountersRepository } from '../infrastructure/repositories/drizzle-patient-encounters.repository'
import { DrizzleBedsRepository } from '../infrastructure/repositories/drizzle-beds.repository'
import { DrizzleOrRoomsRepository } from '../infrastructure/repositories/drizzle-or-rooms.repository'
import { BedsService } from '../application/services/beds.service'
import { OrRoomsService } from '../application/services/or-rooms.service'
import { ServiceContainer } from '../infrastructure/container/service.container'
import { ClinicalDocumentsService } from '../application/services/clinical-documents.service'
import * as renderer from '../utils/pdfRenderer'

test('normalized local MySQL workflows', { skip: process.env.RUN_MYSQL_INTEGRATION !== '1' }, async t => {
  assert.ok(['127.0.0.1', 'localhost'].includes(process.env.DB_HOST ?? ''))
  const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_TENANT_SCHEMA, connectionLimit: 8 })
  const db = createTenantDatabase(pool)
  const run = <T>(fn: () => Promise<T>) => TenantContext.run(pool, db, fn)
  const patientIds = [randomUUID(), randomUUID()]
  const ids = { role: randomUUID(), user: randomUUID(), staff: randomUUID(), episode: randomUUID(), encounter: randomUUID(), invoice: randomUUID(), template: randomUUID() }
  const productIds: string[] = [], bedIds = [randomUUID(), randomUUID()], roomIds = [randomUUID(), randomUUID()]
  const inv = new MysqlInvRepository(), stock = new MysqlStockRepository()
  const product = async (quantity: number) => {
    const id = await run(() => inv.create({ NombreProducto: `TEST-${randomUUID()}`, PrecioUnidad: 12.50, Cantidad: quantity, NivelMinimoStock: 0 }))
    productIds.push(id); return id
  }
  const quantity = async (productId: string, locationId?: string) => {
    const [row] = await db.select({ value: sum(s.inventoryStock.quantity) }).from(s.inventoryStock)
      .where(and(eq(s.inventoryStock.productId, productId), locationId ? eq(s.inventoryStock.locationId, locationId) : undefined, isNull(s.inventoryStock.deletedAt)))
    return Number(row.value ?? 0)
  }
  try {
    await db.insert(s.roles).values({ id: ids.role, name: ids.role, key: ids.role })
    await db.insert(s.users).values({ id: ids.user, roleId: ids.role, name: 'Test', email: `${ids.user}@example.invalid` })
    await db.insert(s.patients).values(patientIds.map(id => ({ id, firstName: 'Test', lastName: 'Normalization' })))
    await db.insert(s.staffMembers).values({ id: ids.staff, firstName: 'Test', lastName: 'Normalization' })
    await db.insert(s.careEpisodes).values({ id: ids.episode, patientId: patientIds[0], openedAt: new Date() })
    await db.insert(s.invoices).values({ id: ids.invoice, invoiceNumber: ids.invoice, patientId: patientIds[0], careEpisodeId: ids.episode, issuedAt: new Date() })
    await db.insert(s.clinicalEncounters).values({ id: ids.encounter, patientId: patientIds[0], staffMemberId: ids.staff, invoiceId: ids.invoice, type: 'outpatient', occurredAt: new Date() })
    await db.insert(s.beds).values(bedIds.map(id => ({ id, code: id, module: 'hospitalization' as const })))
    await db.insert(s.operatingRooms).values(roomIds.map(id => ({ id, code: id })))
    const [main] = await db.select().from(s.inventoryLocations).where(eq(s.inventoryLocations.code, 'main'))
    const [outpatient] = await db.select().from(s.inventoryLocations).where(eq(s.inventoryLocations.code, 'outpatient'))

    await t.test('database rejects cross-patient clinical, episode, attachment and movement links', async () => {
      await assert.rejects(db.insert(s.clinicalEncounters).values({ patientId: patientIds[1], staffMemberId: ids.staff, invoiceId: ids.invoice, type: 'outpatient', occurredAt: new Date() }))
      await assert.rejects(db.insert(s.invoices).values({ patientId: patientIds[1], careEpisodeId: ids.episode, invoiceNumber: randomUUID(), issuedAt: new Date() }))
      await assert.rejects(db.insert(s.careEpisodes).values({ patientId: patientIds[1], previousEpisodeId: ids.episode, openedAt: new Date() }))
      await assert.rejects(db.insert(s.patientMovements).values({ patientId: patientIds[1], clinicalEncounterId: ids.encounter, toStation: 'consulta', source: 'visit', occurredAt: new Date() }))
      await assert.rejects(db.insert(s.patientMovements).values({ patientId: patientIds[0], bedId: randomUUID(), toStation: 'hospitalizacion', source: 'bed', occurredAt: new Date() }))
      await assert.rejects(db.insert(s.clinicalAttachments).values({ patientId: patientIds[1], clinicalEncounterId: ids.encounter, label: 'Test', source: 'file_upload', objectPath: 'test', mimeType: 'application/pdf', sizeBytes: 1, uploadedBy: ids.user }))
      await assert.rejects(db.insert(s.billingLedgerEntries).values({ patientId: patientIds[0], movementId: randomUUID(), source: 'movement', category: 'servicio', description: 'Test', quantity: 1, unitPrice: '1', totalAmount: '1', status: 'Pendiente', occurredAt: new Date() }))
    })

    await t.test('database checks reject conflicting resources, invalid periods, amounts and document identities', async () => {
      const [type] = await db.select().from(s.appointmentTypes).limit(1)
      const [status] = await db.select().from(s.appointmentStatuses).limit(1)
      const [source] = await db.select().from(s.appointmentSources).limit(1)
      const appointment = { typeId: type.id, statusId: status.id, sourceId: source.id, patientId: patientIds[0], title: 'Test', startsAt: new Date(), endsAt: new Date(Date.now() + 60000) }
      await assert.rejects(db.insert(s.appointments).values({ ...appointment, bedId: bedIds[0], operatingRoomId: roomIds[0] }))
      await assert.rejects(db.insert(s.appointments).values({ ...appointment, endsAt: appointment.startsAt }))
      await assert.rejects(db.update(s.invoices).set({ elderlyDiscountPercent: '101' }).where(eq(s.invoices.id, ids.invoice)))
      await assert.rejects(db.insert(s.invoiceItems).values({ invoiceId: ids.invoice, category: 'servicio', description: 'Test', quantity: 2, unitPrice: '10', totalAmount: '10' }))
      await assert.rejects(db.insert(s.documentDeliveries).values({ actorId: ids.user, documentType: 'consent', channel: 'download' }))
      await assert.rejects(db.insert(s.documentDeliveries).values({ actorId: ids.user, documentType: 'invoice_report', channel: 'download', status: 'completed' }))
    })

    await t.test('one active assignment per bed or room and per patient, including concurrent requests', async () => {
      const beds = new BedsService(new DrizzleBedsRepository())
      const payload = (i: number) => ({ patientId: patientIds[i], patientName: 'Test' })
      const results = await Promise.allSettled([run(() => beds.assignBed('hospitalization', bedIds[0], payload(0))), run(() => beds.assignBed('hospitalization', bedIds[0], payload(1)))])
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
      const [assignment] = await db.select().from(s.bedAssignments).where(and(eq(s.bedAssignments.bedId, bedIds[0]), isNull(s.bedAssignments.releasedAt)))
      await assert.rejects(db.insert(s.bedAssignments).values({ bedId: bedIds[1], patientId: assignment.patientId, assignedAt: new Date() }))
      const view = await run(() => beds.getBeds('hospitalization'))
      assert.equal(view.beds.find((bed: any) => bed.id === bedIds[0])?.status, 'occupied')
      const [physical] = await db.select().from(s.beds).where(eq(s.beds.id, bedIds[0]))
      assert.equal(physical.status, 'available')
      await run(() => beds.releaseBed('hospitalization', bedIds[0]))
      await run(() => beds.assignBed('hospitalization', bedIds[1], { patientId: assignment.patientId, patientName: 'Test' }))
      const rooms = new OrRoomsService(new DrizzleOrRoomsRepository())
      await run(() => rooms.assignRoom(roomIds[0], payload(0)))
      await assert.rejects(run(() => rooms.assignRoom(roomIds[1], payload(0))))
      await assert.rejects(db.insert(s.operatingRoomAssignments).values({ operatingRoomId: roomIds[0], patientId: patientIds[1], assignedAt: new Date() }))
    })

    await t.test('legacy inventory endpoints now create UUID products and concurrent consumption never oversells', async () => {
      const id = await product(5)
      const result = await run(() => inv.findById(id))
      assert.equal(result.ProductoID, id)
      assert.equal(result.Cantidad, 5)
      const listed = await run(() => inv.findAll({ limit: 25, offset: 0, term: result.NombreProducto }, 'main'))
      assert.equal(listed[0].ProductoID, id)
      assert.equal(listed[0].Cantidad, 5)
      assert.equal(listed[0].total_registries, 1)
      const attempts = await Promise.allSettled([run(() => stock.reduceStockQuantities([{ id, qty: 4 }])), run(() => stock.reduceStockQuantities([{ id, qty: 4 }]))])
      assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1)
      assert.equal(await quantity(id), 1)
      await assert.rejects(run(() => stock.reduceStockQuantities([{ id, qty: -1 }])))
      await assert.rejects(db.update(s.inventoryStock).set({ quantity: -1 }).where(eq(s.inventoryStock.productId, id)))
      const movements = await db.select().from(s.stockMovements).where(eq(s.stockMovements.productId, id))
      assert.equal(movements.length, 2)
      assert.equal(movements.find(m => m.type === 'consumption')?.quantity, 4)
    })

    await t.test('lots split across locations and encounter returns restore the original lot and location', async () => {
      const id = await product(0), batchId = randomUUID()
      await db.insert(s.inventoryBatches).values({ id: batchId, productId: id, batchNumber: randomUUID(), receivedAt: new Date(), expiresAt: new Date(Date.now() + 86400000 * 30) })
      await db.insert(s.inventoryStock).values({ productId: id, locationId: main.id, batchId, quantity: 10 })
      await run(() => inv.transfer({ prodId: id, prodQty: 4, fromLocId: '1', toLocId: outpatient.id }))
      assert.equal(await quantity(id, main.id), 6)
      assert.equal(await quantity(id, outpatient.id), 4)
      await run(() => stock.reduceStockQuantities([{ id, qty: 3, subinventoryId: outpatient.id }], ids.encounter))
      await run(() => stock.restoreStockQuantities([{ id, qty: 2 }], ids.encounter))
      const [balance] = await db.select().from(s.inventoryStock).where(and(eq(s.inventoryStock.productId, id), eq(s.inventoryStock.locationId, outpatient.id)))
      assert.equal(balance.batchId, batchId)
      assert.equal(balance.quantity, 3)
      assert.equal(await quantity(id), 9)
      await assert.rejects(run(() => stock.restoreStockQuantities([{ id, qty: 2 }], ids.encounter)))
      assert.equal(await quantity(id), 9)
      const other = await product(0)
      await assert.rejects(db.insert(s.inventoryStock).values({ productId: other, batchId, locationId: main.id, quantity: 1 }))
    })

    await t.test('expired lots cannot be consumed and a rejected consumption leaves balances unchanged', async () => {
      const id = await product(0), batchId = randomUUID()
      await db.insert(s.inventoryBatches).values({ id: batchId, productId: id, batchNumber: randomUUID(), receivedAt: new Date(Date.now() - 86400000 * 3), expiresAt: new Date(Date.now() - 86400000) })
      await db.insert(s.inventoryStock).values({ productId: id, locationId: main.id, batchId, quantity: 5 })
      await assert.rejects(run(() => stock.reduceStockQuantities([{ id, qty: 1 }])))
      assert.equal(await quantity(id), 5)
    })

    await t.test('a failure across repositories rolls back invoices, balances and movements on the same connection', async () => {
      const id = await product(5), number = randomUUID()
      await assert.rejects(run(() => TenantContext.transaction(async () => {
        await new MysqlInvoiceRepository().create({ PacienteID: patientIds[0], InvoiceNumber: number, Monto: 1 })
        await stock.reduceStockQuantities([{ id, qty: 2 }])
        throw new Error('rollback-probe')
      })), /rollback-probe/)
      assert.equal(await quantity(id), 5)
      assert.equal((await db.select().from(s.invoices).where(eq(s.invoices.invoiceNumber, number))).length, 0)
      assert.equal((await db.select().from(s.stockMovements).where(eq(s.stockMovements.productId, id))).length, 1)
    })

    await t.test('concurrent aggregate mutations preserve both movement records', async () => {
      const repo = new DrizzlePatientMovementsRepository(), movementIds = [randomUUID(), randomUUID()]
      await Promise.all(movementIds.map(id => run(() => repo.update(store => {
        store.events.push({ id, patientId: patientIds[0], patientName: 'Test', toStation: 'consulta', source: 'manual', occurredAt: new Date().toISOString() })
      }))))
      assert.equal((await db.select().from(s.patientMovements).where(inArray(s.patientMovements.id, movementIds))).length, 2)
    })

    await t.test('payment status is read from the invoice and cannot drift in the episode', async () => {
      await db.update(s.invoices).set({ status: 'Pagado' }).where(eq(s.invoices.id, ids.invoice))
      const episodes = await run(() => new DrizzlePatientEncountersRepository().load())
      assert.equal(episodes.encounters.find(episode => episode.id === ids.episode)?.status, 'Pagado')
      await db.update(s.invoices).set({ status: 'Pendiente' }).where(eq(s.invoices.id, ids.invoice))
    })

    await t.test('a full visit creates its clinical and financial records atomically; edits preserve price snapshots', async () => {
      const id = await product(5), visits = ServiceContainer.getVisitsService()
      const payload: any = { patient: patientIds[1], doctor: ids.staff, origin: 'visits', date: new Date().toISOString(), stockItems: [{ id, qty: 2 }],
        expediente: { standard: { chiefComplaint: 'Test', currentIllness: 'Test', physicalExam: 'Test' }, module: {} } }
      const created = await run(() => visits.createVisit(payload))
      const [encounter] = await db.select().from(s.clinicalEncounters).where(eq(s.clinicalEncounters.id, created.visit))
      const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id, encounter.invoiceId!))
      assert.ok(invoice.careEpisodeId)
      assert.equal((await db.select().from(s.medicalRecords).where(eq(s.medicalRecords.clinicalEncounterId, created.visit))).length, 1)
      assert.equal((await db.select().from(s.patientMovements).where(eq(s.patientMovements.clinicalEncounterId, created.visit))).length, 1)
      assert.equal(await quantity(id), 3)
      await db.update(s.products).set({ unitPrice: '99.00' }).where(eq(s.products.id, id))
      await run(() => visits.editVisit({ id: created.visit, body: { ...payload, stockItems: [{ id, qty: 1 }] } }))
      assert.equal(await quantity(id), 4)
      const [after] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoice.id))
      assert.equal(Number(invoice.amount) - Number(after.amount), 12.5)
      const beforeCount = (await db.select().from(s.invoices).where(eq(s.invoices.patientId, patientIds[1]))).length
      await assert.rejects(run(() => visits.createVisit({ ...payload, stockItems: [{ id, qty: 999 }] })))
      assert.equal((await db.select().from(s.invoices).where(eq(s.invoices.patientId, patientIds[1]))).length, beforeCount)
      assert.equal(await quantity(id), 4)
    })

    await t.test('reprinting an accepted consent preserves its signature and exact version history', async () => {
      await db.insert(s.consentTemplates).values({ id: ids.template, name: ids.template })
      await db.insert(s.consentTemplateVersions).values({ templateId: ids.template, version: 1, content: 'Original' })
      const [attachment] = await db.insert(s.clinicalAttachments).values({ patientId: patientIds[0], clinicalEncounterId: ids.encounter, label: 'Accepted test', source: 'file_upload', objectPath: 'test-consent', mimeType: 'application/pdf', sizeBytes: 10, uploadedBy: ids.user }).$returningId()
      const [accepted] = await db.insert(s.consentInstances).values({ templateId: ids.template, templateVersion: 1,
        clinicalEncounterId: ids.encounter, staffMemberId: ids.staff, status: 'accepted', attachmentId: attachment.id, signerName: 'Original signer', acceptanceMethod: 'checkbox', acceptedAt: new Date() }).$returningId()
      const service = new ClinicalDocumentsService({} as any, {} as any)
      service.getVisitContext = async () => ({ patientId: patientIds[0], doctorId: ids.staff, template: { id: ids.template, name: 'Test', current_version: 1, content: 'Original' } } as any)
      ;(service as any).renderConsentHtml = () => 'test'
      const original = renderer.renderPdfFromHtml
      ;(renderer as any).renderPdfFromHtml = async () => Buffer.from('%PDF-test')
      try {
        const rendered = await run(() => service.printVisit(ids.encounter, ids.template, 1, 'TEST'))
        assert.ok(rendered.consentInstanceId)
        assert.notEqual(rendered.consentInstanceId, accepted.id)
        const [unchanged] = await db.select().from(s.consentInstances).where(eq(s.consentInstances.id, accepted.id))
        assert.equal(unchanged.status, 'accepted')
        assert.equal(unchanged.signerName, 'Original signer')
        assert.equal(unchanged.templateVersion, 1)
      } finally { (renderer as any).renderPdfFromHtml = original }
    })
  } finally {
    try {
      await db.delete(s.documentDeliveries).where(eq(s.documentDeliveries.actorId, ids.user))
      await db.delete(s.appointments).where(inArray(s.appointments.patientId, patientIds))
      await db.delete(s.consentInstances).where(eq(s.consentInstances.templateId, ids.template))
      await db.delete(s.consentTemplateVersions).where(eq(s.consentTemplateVersions.templateId, ids.template))
      await db.delete(s.consentTemplates).where(eq(s.consentTemplates.id, ids.template))
      await db.delete(s.bedEvents).where(inArray(s.bedEvents.bedId, bedIds))
      await db.delete(s.bedAssignments).where(inArray(s.bedAssignments.bedId, bedIds))
      await db.delete(s.operatingRoomEvents).where(inArray(s.operatingRoomEvents.operatingRoomId, roomIds))
      await db.delete(s.operatingRoomAssignments).where(inArray(s.operatingRoomAssignments.operatingRoomId, roomIds))
      await db.delete(s.billingLedgerEntries).where(inArray(s.billingLedgerEntries.patientId, patientIds))
      await db.delete(s.patientMovements).where(inArray(s.patientMovements.patientId, patientIds))
      if (productIds.length) await db.delete(s.stockMovements).where(inArray(s.stockMovements.productId, productIds))
      await db.delete(s.clinicalAttachments).where(inArray(s.clinicalAttachments.patientId, patientIds))
      await db.delete(s.clinicalEncounters).where(inArray(s.clinicalEncounters.patientId, patientIds))
      await db.delete(s.invoices).where(inArray(s.invoices.patientId, patientIds))
      await db.update(s.careEpisodes).set({ previousEpisodeId: null }).where(inArray(s.careEpisodes.patientId, patientIds))
      await db.delete(s.careEpisodes).where(inArray(s.careEpisodes.patientId, patientIds))
      if (productIds.length) {
        await db.delete(s.inventoryStock).where(inArray(s.inventoryStock.productId, productIds))
        await db.delete(s.inventoryBatches).where(inArray(s.inventoryBatches.productId, productIds))
        await db.delete(s.products).where(inArray(s.products.id, productIds))
      }
      await db.delete(s.beds).where(inArray(s.beds.id, bedIds))
      await db.delete(s.operatingRooms).where(inArray(s.operatingRooms.id, roomIds))
      await db.delete(s.staffMembers).where(eq(s.staffMembers.id, ids.staff))
      await db.delete(s.patients).where(inArray(s.patients.id, patientIds))
      await db.delete(s.users).where(eq(s.users.id, ids.user))
      await db.delete(s.roles).where(eq(s.roles.id, ids.role))
    } finally { await pool.end() }
  }
})
