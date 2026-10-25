import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SettingsService } from '../application/services/settings.service'

const inviteWithFailure = (failure: unknown) => {
  const repository = {
    findByEmail: async () => null,
    listRoles: async () => [{ RolID: 'admin-role', NombreRol: 'Admin' }],
    createUser: async () => { throw failure },
  }
  return new SettingsService(repository as any, {} as any, {} as any).inviteUser({
    name: 'QA Test', email: 'invite@example.com', roleId: 'admin-role',
  })
}

test('invites explain duplicate emails for both raw and Drizzle-wrapped driver errors', async () => {
  for (const failure of [{ code: 'ER_DUP_ENTRY' }, { cause: { code: 'ER_DUP_ENTRY' } }]) {
    await assert.rejects(inviteWithFailure(failure), (error: any) => {
      assert.equal(error.name, 'validation_errors')
      assert.match(error.errors[0].msg, /cuenta eliminada/)
      return true
    })
  }
})

test('invites translate wrapped foreign-key errors and preserve unexpected failures', async () => {
  await assert.rejects(inviteWithFailure({ cause: { code: 'ER_NO_REFERENCED_ROW_2' } }),
    (error: any) => error.name === 'validation_errors' && /Rol/.test(error.errors[0].msg))
  const failure = new Error('unexpected storage failure')
  await assert.rejects(inviteWithFailure(failure), (error: unknown) => error === failure)
})
