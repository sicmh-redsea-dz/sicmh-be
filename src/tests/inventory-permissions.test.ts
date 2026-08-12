import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  permissionForSubinventory,
  requireInventoryLocationPermissions
} from '../api/middlewares/permission.middleware'

const response = () => {
  const state = { status: 200, body: undefined as any }
  return {
    state,
    value: {
      status(code: number) {
        state.status = code
        return this
      },
      json(body: any) {
        state.body = body
        return this
      }
    }
  }
}

describe('inventory location permissions', () => {
  test('maps every inventory location to its read permission', () => {
    assert.equal(permissionForSubinventory(1), 'inventory.read')
    assert.equal(permissionForSubinventory(2), 'visits.emergency.read')
    assert.equal(permissionForSubinventory(3), 'visits.operating_room.read')
    assert.equal(permissionForSubinventory(4), 'visits.hospitalization.read')
    assert.equal(permissionForSubinventory(99), null)
  })

  test('blocks loading a clinical inventory without access to its module', async () => {
    const req = {
      query: { subinvId: '2' },
      currentUser: { permissions: ['inventory.read'] }
    } as any
    const res = response()
    let continued = false

    await requireInventoryLocationPermissions('query')(
      req,
      res.value as any,
      () => { continued = true }
    )

    assert.equal(res.state.status, 403)
    assert.equal(continued, false)
  })

  test('requires access to both ends of an inventory transfer', async () => {
    const req = {
      body: { origin: 1, subinv: 3 },
      currentUser: {
        permissions: ['inventory.read', 'inventory.transfer', 'visits.emergency.read']
      }
    } as any
    const res = response()
    let continued = false

    await requireInventoryLocationPermissions('transfer')(
      req,
      res.value as any,
      () => { continued = true }
    )

    assert.equal(res.state.status, 403)
    assert.equal(continued, false)
  })

  test('allows a transfer when both inventory locations are visible', async () => {
    const req = {
      body: { origin: 1, subinv: 3 },
      currentUser: {
        permissions: ['inventory.read', 'inventory.transfer', 'visits.operating_room.read']
      }
    } as any
    const res = response()
    let continued = false

    await requireInventoryLocationPermissions('transfer')(
      req,
      res.value as any,
      () => { continued = true }
    )

    assert.equal(res.state.status, 200)
    assert.equal(continued, true)
  })
})
