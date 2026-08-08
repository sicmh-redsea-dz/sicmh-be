export type ThemePreference = 'light' | 'dark'

export interface UserProfile {
  userId: number
  phone?: string
  address?: string
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
