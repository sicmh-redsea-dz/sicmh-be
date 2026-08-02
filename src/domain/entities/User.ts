export interface User {
    UsuarioID: string
    NombreUsuario: string
    CorreoElectronico: string
    ContrasenaHash?: string
    Activo: number
    NombreRol: string,
    firebaseID: string
    SessionVersion?: number
}
