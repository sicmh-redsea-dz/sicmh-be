import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { inventoryQueries } from '../infrastructure/database/queries/inv.queries'
import { stockQueries } from '../infrastructure/database/queries/stock.queries'
import { visitsQueries } from '../infrastructure/database/queries/visits.queries'

describe('inventory availability queries', () => {
  test('the inventory tabs only list positive stock from the selected subinventory', () => {
    const query = inventoryQueries('all-inv', {
      pagDelimeters: { limit: 10, offset: 0 }
    })

    assert.match(query, /ei\.SubinventarioID\s*=\s*\?/i)
    assert.match(query, /ei\.Cantidad\s*>\s*0/i)
    assert.doesNotMatch(query, /inv\.Cantidad\s*>\s*0/i)
  })

  test('visit stock selectors only list positive stock from their subinventory', () => {
    const query = visitsQueries('get-stock-items')

    assert.match(query, /ei\.SubinventarioID\s*=\s*\?/i)
    assert.match(query, /ei\.Cantidad\s*>\s*0/i)
  })

  test('invoice detail prioritizes the visit inventory history and falls back to invoice inventory', () => {
    const query = stockQueries('find-by-invoice')

    assert.match(query, /Inventario_HistoriaMedica/i)
    assert.match(query, /hm\.FacturaID\s*=\s*\?/i)
    assert.match(query, /Factura_Inventario/i)
    assert.match(query, /not exists/i)
    assert.match(query, /sum\(ihm\.CantidadUsada\)/i)
    assert.match(query, /sum\(fi\.Cantidad\)/i)
  })
})
