export interface AuthResponse {
    _id      : number
    name     : string
    email    : string
    roles?   : string[]
    // token    : string
    isActive?: boolean
    fireUID  : string
    profile?: {
        phone?: string
        address?: string
        identification?: string
        department?: string
        position?: string
        theme?: 'light' | 'dark'
        avatarDataUrl?: string
    }
    permissions?: string[]
}
