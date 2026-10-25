export type ThemePreference = 'light' | 'dark'

export interface UserProfile {
  userId: string
  gender?: 'male' | 'female' | 'unspecified'
  phone?: string
  identification?: string
  department?: string
  position?: string
  theme?: ThemePreference
  avatarDataUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserProfileStore {
  profiles: UserProfile[]
  updatedAt: string
}
