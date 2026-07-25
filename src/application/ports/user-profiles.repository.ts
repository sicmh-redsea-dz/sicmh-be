import { UserProfileStore } from '../../domain/entities/UserProfile'

export interface UserProfilesRepository {
  load(): Promise<UserProfileStore>
  save(store: UserProfileStore): Promise<void>
  update<T>(mutator: (store: UserProfileStore) => T | Promise<T>): Promise<T>
}
