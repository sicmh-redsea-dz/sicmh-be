import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { citasQueries } from '../infrastructure/database/queries/citas.queries'

describe('appointment doctor query', () => {
  test('includes role-based doctors and legacy doctor positions', () => {
    const query = citasQueries('list-doctors')

    assert.match(query, /LEFT JOIN usuarios u ON u\.UsuarioID = p\.UsuarioID/)
    assert.match(query, /LEFT JOIN roles r ON r\.RolID = u\.RolId/)
    assert.match(query, /r\.NombreRol[\s\S]*'doctor'/)
    assert.match(query, /p\.Cargo[\s\S]*'regente'/)
  })
})
