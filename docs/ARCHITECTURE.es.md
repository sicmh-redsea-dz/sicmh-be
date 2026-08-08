# Arquitectura

Este documento describe cómo está construido realmente el backend de
MedIT (repositorio `sicmh-be`, el nombre anterior del proyecto) hoy en
día — las capas, el modelo de multitenancy, la
autenticación, los permisos, el almacenamiento y las inconsistencias/vacíos
conocidos que surgieron a medida que el sistema creció. Señala
deliberadamente las asperezas en lugar de suavizarlas: varias de ellas son
restricciones estructurales importantes (p. ej. el vacío de aislamiento de
datos en los almacenes de archivos, [§12](#12-facturación-encuentros-movimientos-y-libro-mayor--almacenes-basados-en-archivos)),
y reemplaza a la sección "Configuration" de `README.md`, que está
desactualizada.

> Nota: este documento es la traducción al español de
> [ARCHITECTURE.md](./ARCHITECTURE.md). Si ambos difieren, considera la
> versión en inglés como la fuente de verdad hasta que se sincronicen.

## 1. Stack y punto de entrada

Node.js + Express + TypeScript, compilado con `tsc` (salida CommonJS — ver
[§9.4](#file-type-fijado-en-v16) sobre por qué esto importa), MySQL vía
`mysql2/promise`, GCS para almacenamiento de archivos, sin ORM, sin query
builder.

- **Punto de entrada**: [src/server.ts](../src/server.ts) — llama a
  `initializeDb()` (`src/config/db.ts`), que ejecuta `PoolManager.init()` más
  una verificación de sanidad `SELECT NOW()` contra el pool global, y luego
  hace `process.exit(1)` si eso falla. La aplicación se niega a arrancar sin
  conectividad a la base de datos.
- **Aplicación Express**: [src/app.ts](../src/app.ts) conecta el middleware
  en este orden exacto: `trust proxy → helmet() → compression() →
  express.json({limit:'5mb'}) → cors()` → rutas (`/public`, `/app`, `/auth`)
  → un único manejador de errores catch-all que delega en `errorHandler`
  (§8).
- **Ausencias notables**: no hay logger de peticiones (sin morgan), no hay
  rate limiting, no hay protección CSRF, `cors()` no tiene lista blanca de
  orígenes (abierto a todos), `helmet()` usa la configuración por defecto
  sin CSP personalizado. Vale la pena revisitar esto si el servicio alguna
  vez queda expuesto directamente a internet sin un gateway delante.

## 2. Capas (puertos y adaptadores)

El código sigue una forma hexagonal/de arquitectura limpia:

```
api/            → aspectos HTTP: rutas, controladores, middlewares, validadores, constantes de permisos
application/    → lógica de negocio (services) + interfaces de puertos (contratos de los que dependen los services)
domain/         → entidades (con forma de fila de BD), mappers (fila → respuesta), responses (DTOs de cara al cliente)
infrastructure/ → adaptadores concretos: repos MySQL, repos basados en archivos, almacenamiento GCS, pooling de BD, contenedor DI
```

- `domain/entities` reflejan filas crudas de la BD (nombres de columna en
  español/PascalCase, p. ej. `PacienteID`, `FechaNacimiento`). Son formas de
  datos, no objetos de dominio ricos con comportamiento.
- `domain/mappers` son clases estáticas que traducen la forma de la entidad
  → la forma de la respuesta (p. ej. `PacienteID → id`, `Nombre → name`).
- `application/ports/*.repository.ts` son las interfaces de las que dependen
  los services (`findAll`, `findById`, `create`, `update`, `softDelete`, …).
  También existe un puerto que no es un repositorio, `file-storage.ts`, que
  abstrae GCS.
- `application/services` contienen la lógica de negocio y reciben por
  constructor **interfaces de puertos**, no clases de repositorio concretas
  — p. ej. `PatientsService(private readonly patientsRepo: PatientsRepository)`.
- `infrastructure/repositories` implementan esos puertos como:
  - `Mysql*Repository` — SQL crudo vía `Database.execute`/`Database.query`
    (§6), o
  - `File*Repository` — respaldados por JSON (§10) que satisfacen la
    **misma** interfaz de puerto pero almacenan los datos de forma muy
    distinta.

**Dónde el patrón es consistente**: patients, staff, invoice, stock,
dashboard, citas (agenda), clinical-attachments, auth y los overrides de
permisos están todos limpiamente respaldados por MySQL a través de esta
cadena de puertos/adaptadores.

**Dónde se rompe**:
- El libro mayor de facturación (billing ledger), camas, quirófanos,
  expedientes y movimientos/encuentros de pacientes son "repositorios"
  basados en archivos detrás de la misma forma de puerto, pero almacenan
  datos en un único archivo JSON compartido sin ningún tipo de segmentación
  por tenant (§12) — un vacío real respecto a los datos respaldados por
  MySQL.
- Los overrides de permisos son un híbrido: modelados con métodos
  `load()/save()` que *parecen* tener forma de almacén de archivos, pero en
  realidad están respaldados por tablas MySQL por tenant que se crean de
  forma perezosa con `CREATE TABLE IF NOT EXISTS` en el primer acceso
  (`mysql-role-permissions.repository.ts`,
  `mysql-user-permissions.repository.ts`) — un patrón de migración de tabla
  bajo demanda, no un migrador de esquemas tradicional.
- `AuthController` accede directamente a infraestructura (`PoolManager`,
  `TenantContext`) en lugar de pasar por un service, porque la resolución
  del tenant para login/register tiene que ocurrir *antes* de que exista
  `authMiddleware` (y por tanto antes de que exista cualquier ámbito de
  `TenantContext`).

## 3. Inyección de dependencias — localizador de servicios, no un framework DI

[src/infrastructure/container/service.container.ts](../src/infrastructure/container/service.container.ts)
es un **localizador de servicios (service locator) de clase estática hecho a
mano**. Cada service/repo es un getter estático lazy-singleton:

```ts
static getVisitsService(): VisitsService {
  if (!this.visitsService)
    this.visitsService = new VisitsService(
      this.getStaffService(), this.getPatientsService(), this.getStockService(),
      this.getInvoiceService(), this.getBillingService(), this.getVisitsRepository(),
      this.getExpedienteRepository()
    )
  return this.visitsService
}
```

Los controladores llaman a `ServiceContainer.getXService()` directamente, ya
sea en su constructor o como inicializador de campo — no existe un
contenedor IoC a nivel de framework, ni inyección basada en decoradores, ni
forma de intercambiar una implementación sin editar la propia clase del
contenedor. Las instancias de `GcsFileStorage` se construyen directamente
(sin memoizar) dentro de `getClinicalAttachmentsService()`, una por bucket
(clínico vs. público).

## 4. Rutas y controladores

Las rutas viven bajo `src/api/routes/*.route.ts`, un archivo por recurso.
Composición: `app.ts` monta `/public` (sin autenticar), `/app`
(`authMiddleware` aplicado una vez para todo el subárbol, y luego
sub-routers para patients/visits/beds/or-rooms/invoice/billing/settings/
scheduling/inventory/attachments/dashboard), y `/auth` (login/register sin
autenticar; check-token/complete-password-change detrás de
`authMiddleware`).

Convención por ruta:
`requirePermissions(<perm>) → validadores → [middleware de subida] → método del controlador`.

**Coexisten dos estilos de controlador**, algo importante a tener en cuenta
al leer o extender cualquiera de las dos familias:

1. **Estilo manual** (`PatientsController`, `AuthController`,
   `AttachmentsController`, `CitasController`): métodos `(req, res, next)`,
   `res.json(...)` explícito, `catch(err) { next(err) }` explícito. Los
   códigos de estado y los envoltorios de respuesta varían por endpoint
   (200/201/202/206, `{data:...}` vs. `{user, token}`).
2. **Estilo decorador `@asyncHandler()`** (`BedsController`,
   `BillingController`, `DashboardController`, `InvController`,
   `InvoiceController`, `OrRoomsController`, `SettingsController`,
   `VisitsController`): los métodos devuelven un valor; el decorador
   ([src/api/decorators/asyncHandler.ts](../src/api/decorators/asyncHandler.ts))
   lo envuelve en un envoltorio fijo, `{ success: true, message: '...', data
   }`, con un HTTP 200 fijo, y reenvía los errores lanzados a `next(err)`.

No hay un plan para unificar esto — solo hay que tener presente a qué
familia pertenece un controlador dado antes de asumir la forma de su
respuesta.

## 5. Validación

Las cadenas de `express-validator` viven en `src/api/validators/*.validator.ts`
(auth, billing, invoice, patients, settings, visits), todas terminando en un
middleware compartido `handleValidationErrors` que lanza un objeto
`{ name: 'validation_errors', errors: [...] }` — la misma convención de
error que usan los services para sus propios fallos de validación (§8), de
modo que ambas rutas producen respuestas `400 { message: [...] }`
idénticas.

La cobertura es desigual: patients/auth/billing/invoice/visits/settings
tienen cadenas de validación dedicadas; las rutas de
beds/or-rooms/citas/attachments/inventory dependen sobre todo de
verificaciones de permisos más comprobaciones puntuales dentro del
controlador.

## 6. Capa de base de datos

El driver es `mysql2/promise`, sin ORM. Todos los pools configuran
`dateStrings: true` (devuelve las fechas de MySQL como strings, evitando
sorpresas de zona horaria con `Date` de JS).

- **Archivos de consultas**: `src/infrastructure/database/queries/*.queries.ts`,
  uno por dominio, cada uno exportando una función `xQueries(key, ...args)`
  que devuelve un string SQL crudo vía `switch(key)` (p. ej. `'read' |
  'read-one' | 'create' | 'update' | 'soft-delete' | 'total-registries'`).
  Los valores de paginación se interpolan directamente en algunos strings de
  consulta (no se parametrizan) — seguro hoy solo porque quienes llaman
  coercionan con `Number(...)` primero; señalar esto si esa disciplina
  alguna vez se relaja.
- **Repositorios**: `src/infrastructure/repositories/mysql-*.repository.ts`
  son delgados — construyen una consulta vía la función `*.queries.ts`
  correspondiente, llaman a `Database.execute<T>`/`Database.query<T>`, sin
  lógica de negocio.
- La clase **`Database`**
  ([src/infrastructure/database/Database.ts](../src/infrastructure/database/Database.ts))
  obtiene su pool de `TenantContext.getPool()` en cada llamada (lanza un
  error si no hay ningún tenant activo — ver §7), reintenta una vez ante
  errores de conexión obsoleta (`ECONNRESET`, `PROTOCOL_CONNECTION_LOST`,
  errno `-4077`), e implementa un patrón de **transacción ambiental**:
  `Database.transaction(fn)` toma una conexión dedicada, inicia una
  transacción y vuelve a entrar en
  `TenantContext.runWithConnection(connection, fn)` de modo que las llamadas
  anidadas a `Database.execute` dentro de `fn` reutilizan de forma
  transparente la misma conexión/transacción sin cambios en el sitio de
  llamada.

### Esquema

`schema.sql` es la plantilla de esquema por tenant (usada al aprovisionar un
tenant nuevo); `migration.sql` es un script de parcheo incremental e
idempotente para poner al día esquemas de tenants existentes (añade
columnas, convierte `facturas.Estado` de ENUM a VARCHAR, añade las tablas de
adjuntos clínicos, añade índices faltantes). **Ambos archivos pueden
divergir** — p. ej. las tablas `adjuntos_clinicos*` actualmente existen en
`migration.sql` pero aún no están incorporadas a la lista canónica de tablas
de `schema.sql`. Trata `migration.sql` como la fuente más actualizada cuando
ambos discrepen, y reconcílialos periódicamente.

Grupos principales de tablas (esquema por tenant):
- **Identidad/RBAC**: `roles`, `usuarios` (incl. `SessionVersion` — ver
  §11.4), `personal` (personal/staff, FK a `usuarios`).
- **Catálogo**: `tipo_pago`, `servicios`.
- **Clínico**: `pacientes`, `historia_medica` (visitas — signos vitales,
  ENUM `TipoVisita`).
- **Inventario**: `Inventario`, `Subinventario`, `ExistenciasInventario`,
  `Inventario_HistoriaMedica`, `Factura_Inventario`.
- **Facturación**: `facturas` (campos fiscales de Honduras `RTN`/`CAI`,
  descuentos, `InvoiceNumber` único).
- **Agenda**: `citas` (campos de sincronización con calendario externo).
- **Overrides de permisos**: `permiso_rol_overrides`,
  `permiso_usuario_overrides` (§7).
- **Adjuntos clínicos**: `adjuntos_clinicos`, `adjuntos_clinicos_accesos`
  (§9).
- **Rutinas almacenadas**: `sp_mov_inventario` (transferencia de inventario
  entre sub-ubicaciones), `fn_dashboard_stats()` (estadísticas del
  dashboard devueltas como JSON, escrita para usar
  `idx_facturas_active_fecha`/`idx_historia_medica_active_fecha`).

La tabla **global** `empresas` (registro de tenants, vive en
`medit_global`) no tiene ningún DDL en este repositorio — se aprovisiona
fuera de banda directamente contra `medit_global`. Su forma solo se puede
inferir de la interfaz `Empresa` de `PoolManager`: `CodigoEmpresa`,
`NombreBaseDatos` (nombre del esquema del tenant), `ServidorDB`, `PuertoDB`,
`Activo`.

## 7. Multitenancy

Un esquema por tenant. La BD compartida es `medit_global`; cada tenant tiene
su propio esquema MySQL (p. ej. el tenant `HNCAMI` → esquema `cami-vime`).

**Flujo de resolución**:
1. El cliente envía `codigoEmpresa` en login/register, o viaja en el JWT
   (claim `codigoEmpresa`) en peticiones posteriores.
2. `PoolManager.resolveEmpresa(codigoEmpresa)`
   ([src/infrastructure/database/PoolManager.ts](../src/infrastructure/database/PoolManager.ts))
   consulta `medit_global.empresas` (clave en mayúsculas), lanza
   `not_found_error` si no existe o `inactive_company` si `Activo` es falsy.
3. `PoolManager.getPool(codigoEmpresa)` memoiza un pool por tenant
   (`connectionLimit: 3, queueLimit: 20`) en un mapa en memoria indexado por
   el código de tenant en mayúsculas. Los pools inactivos (10+ min sin uso)
   se eliminan mediante un barrido cada 5 minutos — `pool.end()` + borrado
   del mapa.
4. **`TenantContext`**
   ([src/infrastructure/database/TenantContext.ts](../src/infrastructure/database/TenantContext.ts))
   es un envoltorio `AsyncLocalStorage<{pool, connection?}>`. `authMiddleware`
   llama a `TenantContext.run(pool, next)` para que cada llamada a
   repositorio posterior en la cadena async de esa petición resuelva el
   pool correcto sin tener que pasarlo explícitamente por cada firma de
   función. Login/register llaman a `TenantContext.run(pool, ...)`
   manualmente ellos mismos, ya que `authMiddleware` aún no se ha ejecutado
   en ese punto.
5. **Escape del upload con Multer**: Multer termina en eventos de stream de
   socket, que escapan del ámbito de `AsyncLocalStorage` establecido por
   `authMiddleware`. El middleware de subida captura explícitamente
   `TenantContext.getPool()` *antes* de llamar a `multer.single()` y vuelve
   a entrar en `TenantContext.run(pool, ...)` después — un workaround sutil
   pero necesario, documentado en línea en `upload.middleware.ts`.

**Las consultas globales vs. las de tenant** se distinguen puramente por
convención, no por ningún mecanismo automático: `PoolManager.globalPool()`
se usa solo para la búsqueda de `empresas`; todo lo demás pasa por
`Database`, que siempre obtiene su pool de `TenantContext.getPool()` — así
que mientras una petición haya pasado por `authMiddleware` (o un
`TenantContext.run` explícito), sus consultas están inherentemente
delimitadas al tenant correcto.

**Vacío conocido**: los repositorios basados en archivos (§12) **no**
participan en absoluto en esta delimitación. Leen/escriben un único archivo
compartido sin importar qué tenant disparó la llamada — lo que significa
que el libro mayor de facturación, los movimientos/encuentros de pacientes,
las camas, los quirófanos, los datos extra de expedientes y los perfiles de
usuario son efectivamente **globales entre todos los tenants que comparten
este despliegue de backend**. Este es el vacío más grande entre la
intención del modelo de multitenancy y su cobertura real.

## 8. Manejo de errores

Centralizado en
[src/api/middlewares/errorHandler.ts](../src/api/middlewares/errorHandler.ts),
el último `app.use` en `app.ts`. Es un despachador basado en el nombre de
error (`err.name`):

| `err.name`          | Estado | Cuerpo                       |
|---------------------|--------|------------------------------|
| `validation_errors` | 400    | `{ message: err.errors }`   |
| `duplicate_entry`   | 401    | `{ message: err.message }`  |
| `not_found_error`   | 404    | `{ message: err.message }`  |
| `inactive_user`     | 403    | `{ message: err.message }`  |
| *(cualquier otro)*  | 500    | `{ message: 'Internal Server Error' }` (registrado vía `console.error`) |

Nota: `duplicate_entry` mapea a 401, no a 409 — así está implementado hoy;
no lo "arregles" sin antes verificar qué espera el frontend.

Los services/controladores lanzan objetos `Error` planos con una etiqueta
de string `.name` (sin jerarquía de subclases de `Error` personalizada —
todo está tipado mediante strings, así que un error tipográfico en un
nombre de error cae silenciosamente en la rama genérica de 500).
Los helpers `buildError`/`buildValidationError` están duplicados de forma
independiente tanto en `auth.service.ts` como en `billing.service.ts` en
lugar de compartirse.

**`inactive_company`** (lanzado por `PoolManager.resolveEmpresa`) es un caso
especial: se intercepta directamente dentro de `auth.middleware.ts` y se
convierte en un 401 *antes* de que pudiera llegar al `errorHandler`
compartido — así que no todos los errores de resolución de tenant fluyen
por el mismo camino que el resto.

## 9. Autenticación y JWT

La emisión de tokens ocurre únicamente en
`AuthController.register`/`.login`
([src/api/controllers/auth.controller.ts](../src/api/controllers/auth.controller.ts)):

1. El cliente envía `{ email, password, codigoEmpresa }` (ruta sin
   autenticar).
2. El controlador resuelve el pool del tenant vía
   `PoolManager.getPool(codigoEmpresa)`.
3. Envuelve la llamada de login/register en `TenantContext.run(pool, () =>
   ...)` para que las llamadas a repositorio posteriores golpeen el esquema
   de tenant correcto.
4. `generateToken(userId, codigoEmpresa, dbName, sessionVersion)`
   ([src/utils/jwtUtils.ts](../src/utils/jwtUtils.ts)) firma un JWT vía
   `jsonwebtoken`, con los claims `uid`, `codigoEmpresa`, `dbName`, `sv`
   (versión de sesión).

`SECRET_JWT_TOKEN`/`JWT_EXPIRES_IN` provienen directamente de `config`
(expiración por defecto `'2h'` si no está configurada).

**Verificación** (`src/api/middlewares/auth.middleware.ts`), aplicada a todo
`/app/*` más `/auth/check-token` y `/auth/complete-password-change`:
1. Extrae el token Bearer; `verifyToken` distingue `TokenExpiredError`
   ("sesión expirada") de un token genéricamente inválido.
2. **Vuelve a resolver** el pool del tenant a partir del claim
   `codigoEmpresa` del token en cada petición (no confía en el claim
   `dbName` para seleccionar el pool) — esto vuelve a comprobar `Activo` en
   cada petición, así que desactivar una empresa tenant surte efecto de
   inmediato en lugar de solo en el siguiente login.
3. **Invalidación de sesión**: compara `usuarios.SessionVersion` (BD del
   tenant) contra el claim `sv` del token; si no coincide → 401 "sesión
   expirada." `incrementSessionVersion` se ejecuta tanto en login como en
   register, así que **cada login invalida todos los demás tokens vigentes
   de ese usuario** — esto es semántica de una sola sesión activa por
   login, no soporte real de sesiones concurrentes. Ten esto en cuenta antes
   de asumir que un usuario puede estar conectado desde dos dispositivos a
   la vez.
4. Adjunta `req.user = payload` y vuelve a entrar en
   `TenantContext.run(pool, next)`.

**No existe ningún mecanismo de refresh token.** Hay un único token de
acceso con un TTL fijo y la verificación de versión de sesión es la única
palanca de invalidación. Cuando un token expira, el cliente debe volver a
iniciar sesión.

## 10. Permisos

Los permisos son una unión de strings definida estáticamente en código — no
filas en una tabla de catálogo base — definida en
[src/api/permissions/permissions.ts](../src/api/permissions/permissions.ts):
`Permission` (los ~25 strings literales, p. ej. `'patients.read'`,
`'visits.inventory.manage'`), `ALL_PERMISSIONS`, `ROLE_PERMISSIONS`
(permisos por defecto codificados por `RoleKey`: `admin | doctor |
enfermera | recepcionista | asistente`), y
`normalizeRoleName`/`ROLE_ALIASES` (hace coincidir de forma difusa los
strings de nombre de rol de la BD, incluyendo español acentuado, con un
`RoleKey` canónico).

**Permisos con feature flag**: `FEATURE_GATED_PERMISSIONS` (actualmente solo
`'visits.inventory.manage'`) se excluye explícitamente de los valores por
defecto de *todos* los roles, incluido admin, para que una funcionalidad
nueva permanezca desactivada para todos los tenants hasta que se conceda
deliberadamente por tenant vía overrides.

**Los overrides por tenant son filas reales de BD**, por tenant, en dos
niveles:

```sql
CREATE TABLE IF NOT EXISTS permiso_rol_overrides (
  rol_key VARCHAR(50) PRIMARY KEY, grants JSON NOT NULL, revokes JSON NOT NULL, updated_at VARCHAR(30) NOT NULL
);
CREATE TABLE IF NOT EXISTS permiso_usuario_overrides (
  usuario_id INT PRIMARY KEY, grants JSON NOT NULL, revokes JSON NOT NULL, updated_at VARCHAR(30) NOT NULL
);
```

**Resolución** (`AccessControlService.resolvePermissions(roles, userId)`):
1. Se parte de los permisos por defecto del rol, unidos entre todos los
   roles del usuario.
2. Se aplican los overrides a nivel de rol (grants suman, revokes restan).
3. Se aplican los overrides a nivel de usuario encima — estos ganan al
   final (máxima precedencia).

Cada cambio de override se registra (de forma "fire-and-forget") en
`permiso_auditoria` vía `src/utils/permissionAudit.ts`.

**Aplicación**: el middleware `requirePermissions(...)` /
`requireAnyPermission(...)` / `requirePermissionsIf(predicate, ...)`
(`src/api/middlewares/permission.middleware.ts`) resuelve el usuario
actual, resuelve su conjunto efectivo de permisos, y responde 403 si falta
el/los permiso(s) requerido(s). Se aplica por ruta (una llamada por
endpoint, por convención) — no existe una capa de aplicación global, así
que una ruta a la que le falte una llamada explícita a `requirePermissions`
solo está protegida por autenticación, no por autorización.

## 11. Adjuntos clínicos (almacenamiento GCS)

[src/infrastructure/storage/gcs-file-storage.ts](../src/infrastructure/storage/gcs-file-storage.ts)
implementa el puerto `FileStorage` sobre `@google-cloud/storage`, con un
cliente `Storage` singleton creado de forma perezosa. Dos buckets:
`GCS_CLINICAL_BUCKET` (archivos clínicos privados) y `GCS_PUBLIC_BUCKET`
(activos públicos, p. ej. logos de tenant).

**Tablas** (por tenant, añadidas vía `migration.sql`): `adjuntos_clinicos`
(solo borrado suave vía `deleted_at` — "no hay borrados duros en ninguna
parte de esta funcionalidad" según un comentario en línea) y
`adjuntos_clinicos_accesos` (un log de auditoría por
visualización/descarga, escrito antes de que se transmita cualquier byte).

**Pipeline de subida** (`ClinicalAttachmentsService`):
- Límites de tamaño: 10MB para `in_app_camera`, 25MB para `file_upload`,
  aplicados tanto en la capa de multer como de nuevo en el service.
- **Lista blanca de MIME aplicada mediante sniffing de magic bytes (vía
  `file-type`), nunca por nombre de archivo/extensión** —
  jpeg/png/webp/pdf/msword/docx. El `.doc` heredado se reporta como
  `application/x-cfb` (contenedor OLE2); se acepta solo si el cliente
  *también* declaró `application/msword`, de modo que un ejecutable
  renombrado no puede pasar como un doc solo por la extensión.
- Las capturas de cámara siempre se re-codifican mediante `sharp`: se
  aplica la orientación EXIF → se redimensiona a un ancho máximo de 2048px →
  se re-codifica como JPEG q85 → se vuelve a comprobar que sea ≤3MB.
  `.withMetadata()` deliberadamente *no* se llama, así que los metadatos
  EXIF/GPS se eliminan por defecto — relevante para la privacidad de fotos
  clínicas.
- Convención de ruta del objeto GCS:
  `{tenantCode}/patients/{patientId}/{timestamp}_{filename}`.
- **Defensa en profundidad por tenant**: `getForAccess(id, tenantCode)`
  vuelve a comprobar que el `gcs_object_path` almacenado comienza con
  `{tenantCode}/` aunque la búsqueda en BD ya está delimitada al tenant
  correcto por el pool de conexión — cinturón y tirantes, y es lo único en
  este código con una prueba unitaria dedicada
  (`src/tests/clinical-attachments.validation.test.ts`, "tenant path
  defense in depth").
- La subida del logo del tenant es un camino más simple y separado:
  validado como imagen, convertido a PNG, redimensionado para caber en
  1024×1024, almacenado en una ruta pública fija `{tenantCode}/logo.png` —
  sin fila en BD; el frontend construye la URL pública directamente.

**Soporte de Range/streaming**: `src/utils/httpRange.ts` implementa el
parseo de rango único de RFC 7233 (sufijo/abierto/cerrado), usado por
`AttachmentsController.stream` tanto para `/view` como `/download`,
configurando correctamente `Accept-Ranges`/`Content-Range` y los estados
206/416.

### `file-type` fijado en v16

`package.json` fija `file-type` en `^16.5.4`. La razón probable (no
declarada en ningún sitio del repo, así que verifícalo con el equipo antes
de tratarlo como un hecho asentado): `file-type` v17+ pasó a ser solo ESM,
lo cual entra en conflicto con la compilación CommonJS de TypeScript de este
proyecto (`tsconfig.json`: `"module": "commonjs"`). Actualizar implicaría
convertir el backend entero a ESM o usar gimnasia de `import()` dinámico en
cada sitio de llamada — se fijó v16 en su lugar, como la última versión
mayor compatible con CJS.

## 12. Facturación, encuentros, movimientos y libro mayor — almacenes basados en archivos

**Esto no son tablas MySQL.** Son archivos JSON planos bajo `data/*.json`
en el repositorio (`billing-ledger.json`, `patient-movements.json`,
`patient-encounters.json`, `expedientes.json`, `beds.json`,
`or-rooms.json`, `user-profiles.json`), leídos/escritos vía `fs.promises`, y
versionados en git. (`role-permissions.json`/`user-permissions.json`
también existen aquí pero parecen vestigiales — los datos reales de
permisos ahora viven en las tablas de override de MySQL, §10.)

Cada repo de archivo (`FileBillingLedgerRepository`,
`FilePatientMovementsRepository`, etc.) sigue la misma plantilla: `load()`
(mkdir -p, lee, JSON.parse, crea un valor por defecto si hay ENOENT),
`save(store)` (sobrescritura completa del archivo), y `update(mutator)` que
envuelve `load → mutator → save` en un lock.

**Control de concurrencia** —
[src/infrastructure/utils/file-lock.ts](../src/infrastructure/utils/file-lock.ts)
es un lock de cadena de promesas **en memoria y local al proceso**, indexado
por ruta de archivo. Solo serializa las secuencias `load→mutate→save`
*dentro de un único proceso de Node.js*.

**Riesgos concretos que esto genera**:
1. **Sin seguridad entre procesos.** Si esto alguna vez se ejecuta con más
   de un worker (modo clúster, múltiples réplicas de contenedor), cada
   proceso tiene su propio mapa de locks independiente — dos procesos
   pueden ambos cargar, ambos mutar su propia copia en memoria, y el
   segundo `save()` sobrescribe silenciosamente al primero (carrera de
   actualización perdida). No escales este servicio horizontalmente sin
   resolver esto primero.
2. **No delimitado por tenant** (§7) — cada tenant que comparte este
   despliegue lee y escribe los *mismos* archivos JSON. El lock por
   archivo aún evita una escritura corrupta dentro de un proceso, pero los
   datos de todos los tenants viven en un mismo blob no particionado, lo
   cual es en sí mismo un problema de aislamiento de datos y escalabilidad,
   independiente de la condición de carrera.
3. **Sin atomicidad entre almacenes.** P. ej.
   `BillingService.createManualCharge` toca el almacén de encuentros, luego
   el almacén del libro mayor, y luego hace una llamada MySQL real para
   incrementar el monto de la factura, como tres operaciones separadas sin
   rollback entre ellas — un fallo a mitad de la secuencia deja los
   almacenes JSON y `facturas.Monto` inconsistentes. (El lado MySQL de esa
   operación específica se hizo deliberadamente atómico — `UPDATE ... SET
   Monto = GREATEST(0, Monto + delta) WHERE Estado='Pendiente'` —
   precisamente para evitar una carrera de leer-luego-escribir en esa
   columna; el lado del archivo JSON no tiene una salvaguarda equivalente.)
4. **Riesgo de Docker/despliegue.** El `Dockerfile` hace `COPY data/
   ./data/` en tiempo de construcción de la imagen. A menos que el
   despliegue monte un volumen externo sobre `/app/data`, las escrituras en
   tiempo de ejecución sobre estos archivos son efímeras al contenedor y se
   perderán en cada redeploy/reinicio/reescalado, revirtiendo a lo último
   que se haya subido a git. **Trata `data/*.json` como datos semilla, no
   como almacenamiento durable, a menos que se confirme un volumen externo
   en la configuración de despliegue.**

`BillingService` (`src/application/services/billing.service.ts`) es un
híbrido genuino: cruza datos reales de MySQL (libro mayor de facturas,
libro mayor de inventario, búsquedas de facturas) con los almacenes
basados en JSON de ledger/movements/encounters para construir un reporte de
facturación unificado, más generación de PDF vía Puppeteer
(`src/utils/pdfRenderer.ts`).

## 13. Configuración

[src/config/env.ts](../src/config/env.ts) carga `.env` vía `dotenv` y
exporta un objeto plano con fallbacks `||` — sin validación de esquema (sin
zod/joi), así que una variable requerida faltante (p. ej. `DB_USER`,
`SECRET_JWT_TOKEN`) falla en silencio en el punto de uso en lugar de al
arrancar. Asperezas conocidas:

- `DB_PORT` por defecto es `'5432'` en `env.ts`, pero `PoolManager` cae de
  forma independiente a `'3306'` (el valor por defecto real de MySQL) en
  todos los sitios donde realmente usa el puerto — así que el valor por
  defecto de `env.ts` es efectivamente muerto/engañoso. No lo tomes como
  documentación del valor por defecto real.
- `SECRET_JWT_TOKEN` por defecto es `''` si no está configurado — un
  valor por defecto silencioso y peligroso en cualquier entorno donde la
  variable de entorno no esté realmente configurada.
- La configuración SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`) se lee de forma
  puntual directamente de `process.env` dentro de
  `SettingsService.sendInviteEmail`, saltándose por completo el objeto
  `config` central. Si alguna falta, los correos de invitación se omiten en
  silencio (`console.warn`, devuelve `false`) en lugar de fallar de forma
  ruidosa.
- No hay ningún `.env.example` en el repositorio (`.env` está en
  `.gitignore`). Las variables de entorno realmente en uso, como
  referencia:

  ```
  PORT, HOST, PUBLIC_BASE_URL
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA
  SECRET_JWT_TOKEN, JWT_EXPIRES_IN
  GCS_CLINICAL_BUCKET, GCS_PUBLIC_BUCKET, GCS_KEY_FILE
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  ```

  La sección "Configuration" de `README.md` solo lista un subconjunto de
  estas (e incorrectamente lista MongoDB como requisito — este proyecto es
  exclusivamente MySQL). Trata este documento como autoritativo por encima
  del README para las variables de entorno.

## 14. Pruebas

`npm test` ejecuta `tsc && node --test "dist/tests/*.test.js"` — el test
runner integrado de Node, sin Jest/Mocha/Vitest.

Solo existe un archivo de pruebas automatizadas real:
`src/tests/clinical-attachments.validation.test.ts`, que cubre
`ClinicalAttachmentsService` vía fakes en memoria (`FakeStorage implements
FileStorage`, `FakeRepo implements ClinicalAttachmentsRepository`) — lista
blanca de MIME/sniffing de magic bytes, el pipeline de cámara con sharp,
validación de entrada de subida, la verificación de defensa en profundidad
por tenant, y `parseRangeHeader`. Que el service se pueda probar de forma
tan limpia contra fakes es una buena señal para el límite de
puertos/adaptadores en esa área concreta.

`src/tests/range-harness.ts` **no** es una prueba automatizada — es un
servidor de smoke-test manual para el comportamiento de Range
(`node dist/tests/range-harness.js` + `curl -H "Range: ..."`), excluido del
glob de `node --test` por su nombre de archivo.

**Vacío de cobertura** que vale la pena señalar explícitamente: no hay
cobertura de pruebas para auth/JWT, resolución de permisos
(`AccessControlService`), multitenancy (`PoolManager`/`TenantContext`),
ningún repositorio MySQL, ni los services basados en archivos de
billing/movements/encounters — a pesar de que el §12 anterior describe
condiciones de carrera reales precisamente en esa última área. Si este
proyecto invierte en pruebas a continuación, ese es el lugar de mayor valor
para empezar.

## Resumen de vacíos conocidos

Como referencia rápida, los problemas estructurales señalados arriba:

- Los almacenes basados en archivos (libro mayor de facturación,
  movimientos, encuentros, camas, quirófanos, expedientes, perfiles de
  usuario) **no están delimitados por tenant** y **no son seguros entre
  múltiples procesos** (§12).
- `data/*.json` no es almacenamiento durable a menos que el despliegue
  monte un volumen externo (§12).
- No hay flujo de refresh token; el login invalida todas las demás
  sesiones de ese usuario (§9).
- No hay cobertura de pruebas para auth, permisos, multitenancy, ni ningún
  repositorio MySQL (§14).
- `schema.sql` y `migration.sql` pueden divergir; `migration.sql` está
  actualmente más al día para las tablas de adjuntos clínicos (§6).
- No hay lista blanca de CORS, ni rate limiting, ni logging de peticiones
  (§1).
- La sección de configuración de `README.md` está desactualizada — este
  documento la reemplaza.
