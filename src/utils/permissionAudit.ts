import { Database } from '../infrastructure/database/Database'

let tableReady = false

const ensureTable = async () => {
  if (tableReady) return
  await Database.query(
    `CREATE TABLE IF NOT EXISTS permiso_auditoria (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      actor_id    INT          NOT NULL,
      tipo        VARCHAR(20)  NOT NULL,
      target      VARCHAR(100) NOT NULL,
      grants      JSON         NOT NULL,
      revokes     JSON         NOT NULL,
      ocurrido_en TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )`
  )
  tableReady = true
}

export const auditPermissionChange = (
  actorId: number,
  tipo: 'role' | 'user',
  target: string,
  grants: string[],
  revokes: string[]
): void => {
  ensureTable()
    .then(() =>
      Database.execute(
        `INSERT INTO permiso_auditoria (actor_id, tipo, target, grants, revokes)
         VALUES (?, ?, ?, ?, ?)`,
        [actorId, tipo, target, JSON.stringify(grants), JSON.stringify(revokes)]
      )
    )
    .catch((err) => console.error('[audit] Failed to write permission audit log', err))
}
