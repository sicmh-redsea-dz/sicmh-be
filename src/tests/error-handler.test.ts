import assert from 'node:assert/strict'
import { test } from 'node:test'
import { errorHandler } from '../api/middlewares/errorHandler'

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

test('duplicate entries return conflict instead of unauthorized', () => {
  const res = response()
  const error = Object.assign(new Error('El correo ya está registrado.'), {
    name: 'duplicate_entry'
  })

  errorHandler(error, res.value as any, (() => undefined) as any)

  assert.equal(res.state.status, 409)
  assert.deepEqual(res.state.body, { message: 'El correo ya está registrado.' })
})
