export interface Register {
  name     : string
  email    : string
  password : string
}

export interface Login {
  email   : string
  password: string
}

export interface AuthResponse {
  _id      : number
  name     : string
  email    : string
  roles?   : string[]
  token    : string
  isActive?: boolean
}