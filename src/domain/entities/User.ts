export interface User {
    UsuarioID: number
    NombreUsuario: string
    CorreoElectronico: string
    ContrasenaHash?: string
    Activo: number
    NombreRol: string,
    firebaseID: string
    SessionVersion?: number
}