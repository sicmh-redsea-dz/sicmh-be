export interface AuthResponse {
    _id      : number
    name     : string
    email    : string
    roles?   : string[]
    // token    : string
    isActive?: boolean
    fireUID  : string
}