import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { VisitsService } from '../application/services/visits.service'
import { Database } from '../infrastructure/database/Database'

const originalTransaction = Database.transaction

afterEach(() => {
  Database.transaction = originalTransaction
})

const visitPayload = {
  date: '2026-09-01',
  doctor: '7',
  patient: 15,
  origin: 'visits',
  stockItems: [
    { id: 1, qty: 1 },
    { id: 2, qty: 1 },
    { id: 3, qty: 1 },
  ],
}

function buildService(defaultConsulta: { id: number; name: string; price: number } | null) {
  const createdAmounts: number[] = []

  const stockService = {
    // mysql2 returns DECIMAL aggregates as strings unless decimalNumbers is
    // enabled. This is the production shape that originally turned
    // 255.00 + 1100 into the string "255.001100".
    readAmountByStockQty: async () => '255.00',
    reduceStockQuantities: async () => undefined,
    insertStockInvoice: async () => undefined,
    insertStockHistory: async () => undefined,
  }
  const invoiceService = {
    createInvoice: async ({ amount }: { amount: number }) => {
      createdAmounts.push(amount)
      return { id: 91, invoiceNumber: 'invoice-test-91' }
    },
  }
  const billingService = {
    getDefaultConsultaService: async () => defaultConsulta,
    registerEncounterForInvoice: async () => ({ id: 'encounter-test-91' }),
    createMovement: async () => undefined,
    addConsultaServiceLedgerItem: async () => undefined,
  }
  const patientService = {
    findOnePatient: async () => ({ name: 'Tomas', lastName: 'Martinez' }),
  }
  const visitsRepo = {
    create: async () => 31,
  }

  const service = new VisitsService(
    {} as any,
    patientService as any,
    stockService as any,
    invoiceService as any,
    billingService as any,
    visitsRepo as any,
    {} as any,
  )

  return { service, createdAmounts }
}

describe('outpatient invoice total', () => {
  test('adds the consultation service to the medication subtotal before creating the invoice', async () => {
    Database.transaction = async (fn) => fn()
    const { service, createdAmounts } = buildService({
      id: 1,
      name: 'Cita Medica Programada',
      price: 1100,
    })

    await service.createVisit(visitPayload as any)

    assert.deepEqual(createdAmounts, [1355])
  })

  test('does not create a medication-only outpatient invoice when consultation is not configured', async () => {
    Database.transaction = async (fn) => fn()
    const { service, createdAmounts } = buildService(null)

    await assert.rejects(
      service.createVisit(visitPayload as any),
      (error: any) => {
        assert.equal(error.name, 'validation_errors')
        assert.equal(error.errors?.[0]?.msg, 'No hay un servicio de consulta configurado para generar la factura.')
        return true
      },
    )
    assert.deepEqual(createdAmounts, [])
  })
})
