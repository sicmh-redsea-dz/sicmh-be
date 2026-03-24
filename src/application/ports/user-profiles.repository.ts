import { UserProfileStore } from '../../domain/entities/UserProfile'

export interface UserProfilesRepository {
  load(): Promise<UserProfileStore>
  save(store: UserProfileStore): Promise<void>
}
