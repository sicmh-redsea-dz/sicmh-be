# Correccion de invitaciones QA - 24 de octubre de 2026 (Honduras)

La cuenta solicitada estaba eliminada logicamente y su correo seguia reservado por el indice unico. Drizzle envolvia el error MySQL `ER_DUP_ENTRY` en `cause`; la invitacion solo comprobaba el codigo exterior y devolvia HTTP 500.

Se recupero la cuenta solicitada con rol admin y estado activo, conservando su hash de contrasena y aumentando la version de sesion. Se recupero su perfil asociado. No se modificaron credenciales ni registros de produccion.

La invitacion ahora interpreta los errores de clave duplicada y referencia invalida envueltos por Drizzle y devuelve errores de validacion. El correo de una cuenta eliminada sigue reservado; no se recuperan cuentas automaticamente al intentar invitarlas.

- Build: `8553ace3-6a67-4d18-b7b8-a77937d31516`, SUCCESS.
- Revision staging: `medit-be-staging-00002-522`, 100% de trafico.
- Despliegue con `-SkipDatabaseSetup`: no se ejecutaron migraciones ni semillas.
- Compilacion TypeScript y dos pruebas de regresion: correctas.
- Verificacion API: cuenta solicitada activa con rol admin; invitacion de administrador ficticio con perfil y login con contrasena temporal correctos; eliminacion logica y posterior intento de reutilizar correo devuelve HTTP 400 con explicacion.
- La cuenta ficticia de la prueba queda eliminada logicamente.
