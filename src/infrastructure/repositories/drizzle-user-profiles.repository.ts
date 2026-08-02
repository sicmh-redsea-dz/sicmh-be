import { eq, isNull } from 'drizzle-orm'
import { UserProfilesRepository } from '../../application/ports/user-profiles.repository'
import { UserProfile, UserProfileStore } from '../../domain/entities/UserProfile'
import { TenantContext } from '../database/TenantContext'
import { userProfiles } from '../database/schema/tenant'

export class DrizzleUserProfilesRepository implements UserProfilesRepository {
  async load(): Promise<UserProfileStore> {
    const rows = await TenantContext.getDb().select().from(userProfiles).where(isNull(userProfiles.deletedAt))
    const profiles = rows.map((row): UserProfile => ({
      userId: row.userId,
      phone: row.phone ?? undefined,
      identification: row.identification ?? undefined,
      department: row.department ?? undefined,
      position: row.position ?? undefined,
      theme: row.theme,
      avatarDataUrl: row.avatarDataUrl ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
    const updatedAt = rows.reduce(
      (latest, row) => row.updatedAt > latest ? row.updatedAt : latest,
      new Date(0),
    )
    return { profiles, updatedAt: updatedAt.toISOString() }
  }

  async save(store: UserProfileStore): Promise<void> {
    const db = TenantContext.getDb()
    const existing = await db.select({ id: userProfiles.id, userId: userProfiles.userId }).from(userProfiles)
    const incomingUserIds = new Set(store.profiles.map((profile) => profile.userId))

    for (const row of existing) {
      if (!incomingUserIds.has(row.userId)) {
        await db.update(userProfiles).set({ deletedAt: new Date() }).where(eq(userProfiles.id, row.id))
      }
    }

    for (const profile of store.profiles) {
      await db
        .insert(userProfiles)
        .values({
          userId: profile.userId,
          phone: profile.phone,
          identification: profile.identification,
          department: profile.department,
          position: profile.position,
          theme: profile.theme ?? 'light',
          avatarDataUrl: profile.avatarDataUrl,
        })
        .onDuplicateKeyUpdate({
          set: {
            phone: profile.phone,
            identification: profile.identification,
            department: profile.department,
            position: profile.position,
            theme: profile.theme ?? 'light',
            avatarDataUrl: profile.avatarDataUrl,
            deletedAt: null,
          },
        })
    }
  }

  async update<T>(mutator: (store: UserProfileStore) => T | Promise<T>): Promise<T> {
    const store = await this.load()
    const result = await mutator(store)
    await this.save(store)
    return result
  }
}
