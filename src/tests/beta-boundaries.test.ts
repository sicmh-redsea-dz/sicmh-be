import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthService } from '../application/services/auth.service'
import { requireInventoryLocationPermissions, requireVisitOriginPermission } from '../api/middlewares/permission.middleware'
import { TenantContext } from '../infrastructure/database/TenantContext'

const invoke = async (guard: any, permissions: string[], parts: any = {}) => {
  const req = { currentUser: { permissions }, params: {}, query: {}, body: {}, ...parts }
  let status = 200, continued = false, error: unknown
  const res = { status(code: number) { status = code; return this }, json() {} }
  await guard(req, res, (err?: unknown) => { error = err; continued = !err })
  return { status, continued, error, req }
}
const withRows = async (responses: any[][], run: () => Promise<void>) => {
  const original = TenantContext.getDb
  TenantContext.getDb = (() => ({ select: () => {
    const rows = responses.shift() ?? []
    const chain: any = { from: () => chain, leftJoin: () => chain, where: () => chain,
      limit: async () => rows, then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) }
    return chain
  } })) as any
  try { await run() } finally { TenantContext.getDb = original }
}

test('password recovery has the same public response for absent/inactive accounts and every mail outcome', async () => {
  let expected: string | undefined
  for (const account of [null, { UsuarioID: 'test', Activo: 0 }, { UsuarioID: 'test', Activo: 1, SessionVersion: 0 }]) {
    for (const mail of ['sent', 'missing', 'failure']) {
      const service = new AuthService({ findByEmail: async () => account, storePasswordResetToken: async () => {} } as any)
      ;(service as any).sendPasswordResetEmail = async (payload: any) => {
        assert.match(payload.resetUrl, /token=/, 'legitimate delivery still receives the reset link')
        if (mail === 'failure') throw new Error('simulated transport failure')
        return mail === 'sent'
      }
      const response = await service.requestPasswordReset({ email: 'test@example.test', codigoEmpresa: 'TEST' })
      expected ??= response.message
      assert.equal(response.message, expected)
      assert.doesNotMatch(response.message, /token=|https?:|SMTP/)
    }
  }
})

test('inventory checks both transfer endpoints after resolving canonical location codes', async () => {
  await withRows([[{ code: 'main' }], [{ code: 'operating_room' }]], async () => {
    const result = await invoke(requireInventoryLocationPermissions('transfer'), ['inventory.read', 'inventory.transfer'],
      { body: { origin: 1, subinv: '550e8400-e29b-41d4-a716-446655440000' } })
    assert.equal(result.status, 403); assert.equal(result.continued, false)
  })
  await withRows([[{ code: 'main' }], [{ code: 'operating_room' }]], async () => {
    assert.equal((await invoke(requireInventoryLocationPermissions('transfer'),
      ['inventory.read', 'inventory.transfer', 'visits.operating_room.read'], { body: { origin: 'main', subinv: 3 } })).continued, true)
  })
  await withRows([[]], async () => {
    assert.equal((await invoke(requireInventoryLocationPermissions('query'), ['inventory.read'], { query: { subinvId: 'unknown' } })).status, 400)
  })
})

test('clinical stock catalogs support update-only roles and reject another module', async () => {
  for (const [permission, allowed] of [['visits.emergency.update', true], ['visits.outpatient.update', false]] as const) {
    await withRows([[{ code: 'emergency' }]], async () => {
      assert.equal((await invoke(requireInventoryLocationPermissions('stock'), [permission], { query: { term: '2' } })).continued, allowed)
    })
  }
})

test('visit access trusts persisted module and movement trail, never a spoofed body', async () => {
  const row = { type: 'outpatient', episode: 'episode', invoiceEpisode: null }
  await withRows([[row], []], async () => {
    const result = await invoke(requireVisitOriginPermission('update', 'id'), ['visits.emergency.update'],
      { params: { id: 'visit' }, body: { origin: 'emergency' } })
    assert.equal(result.status, 403)
  })
  await withRows([[row], [{ from: 'consulta', to: 'emergencia' }]], async () => {
    const result = await invoke(requireVisitOriginPermission('read', 'id'), ['visits.emergency.read'], { params: { id: 'visit' } })
    assert.equal(result.continued, true, 'legitimate transferred visits remain accessible')
  })
  for (const body of [{ visitType: 'Emergencia' }, { invoiceId: 'another-invoice' }]) {
    await withRows([[row], []], async () => {
      assert.equal((await invoke(requireVisitOriginPermission('update', 'id'), ['visits.outpatient.update'], { params: { id: 'visit' }, body })).status, 400)
    })
  }
})

test('list scopes reject invalid selectors and set an explicit outpatient default', async () => {
  const result = await invoke(requireVisitOriginPermission('read', 'query'), ['visits.outpatient.read'])
  assert.equal(result.continued, true); assert.equal((result.req.query as any).ext, 'visits')
  assert.equal((await invoke(requireVisitOriginPermission('read', 'query'), ['visits.outpatient.read'], { query: { ext: 'all' } })).status, 400)
  assert.equal((await invoke(requireVisitOriginPermission('read', 'query'), ['visits.operating_room.read'], { query: { ext: 'o-room' } })).continued, true)
})

test('a transferred outpatient visit cannot bypass the outpatient inventory feature gate', async () => {
  const row = { type: 'outpatient', episode: 'episode', invoiceEpisode: null }
  await withRows([[row], [{ from: 'consulta', to: 'emergencia' }], [{ id: 'used-product' }]], async () => {
    const result = await invoke(requireVisitOriginPermission('update', 'id'),
      ['visits.outpatient.update', 'visits.emergency.update'],
      { params: { id: 'visit' }, body: { origin: 'emergency', stockItems: [] } })
    assert.equal(result.status, 403)
  })
})

test('stock deltas reject negative, fractional and duplicate quantities and use server location', async () => {
  const { VisitsService } = await import('../application/services/visits.service')
  const service: any = new VisitsService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any)
  for (const incoming of [[{ id: 'p', qty: -1 }], [{ id: 'p', qty: 1.5 }], [{ id: 'p', qty: 1 }, { id: 'p', qty: 2 }]])
    assert.throws(() => service.computeStockDelta([], incoming, 'emergency'))
  assert.deepEqual(service.computeStockDelta([{ stockId: 'p', stockQty: 2 }], [], 'emergency'),
    [{ id: 'p', qty: -2, subinventoryId: 'emergency' }])
  assert.equal(service.computeStockDelta([], [{ id: 'p', qty: 1, subinventoryId: 'main' }], 'emergency')[0].subinventoryId, 'emergency')
})


test('reset tokens cannot authenticate as session tokens and valid sessions still verify', async () => {
  const { generatePasswordResetToken, generateToken, verifyToken } = await import('../utils/jwtUtils')
  assert.throws(() => verifyToken(generatePasswordResetToken('test', 'TEST', 0)))
  assert.equal(verifyToken(generateToken('test', 'TEST', 'tenant', 0)).dbName, 'tenant')
})
