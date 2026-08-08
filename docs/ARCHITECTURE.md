# Architecture

This document describes how the MedIT backend (repo `sicmh-be`, the project's old name) is actually built today — the
layering, the multitenancy model, auth, permissions, storage, and the known
gaps/inconsistencies that fell out of how the system grew. It intentionally
calls out rough edges rather than smoothing them over: several of them are
load-bearing constraints (e.g. the file-store data isolation gap), and
supersedes `README.md`'s "Configuration" section, which is stale.

> Versión en español: [ARCHITECTURE.es.md](./ARCHITECTURE.es.md).

## 1. Stack & entry point

Node.js + Express + TypeScript, compiled with `tsc` (CommonJS output — see
[§9.4](#94-file-type-pinned-to-v16) for why that matters), MySQL via
`mysql2/promise`, GCS for file storage, no ORM, no query builder.

- **Entry point**: [src/server.ts](../src/server.ts) — calls
  `initializeDb()` (`src/config/db.ts`), which runs `PoolManager.init()` plus a
  `SELECT NOW()` sanity check against the global pool, then `process.exit(1)`s
  if that fails. The app refuses to boot without DB connectivity.
- **Express app**: [src/app.ts](../src/app.ts) wires middleware in this exact
  order: `trust proxy → helmet() → compression() → express.json({limit:'5mb'})
  → cors()` → routes (`/public`, `/app`, `/auth`) → a single catch-all error
  handler that delegates to `errorHandler` (§8).
- **Notable absences**: no request logger (no morgan), no rate limiting, no
  CSRF protection, `cors()` has no origin allowlist (wide open), `helmet()`
  uses defaults with no custom CSP. Worth revisiting if this ever sits
  directly on the public internet without a gateway in front of it.

## 2. Layering (ports & adapters)

The codebase follows a hexagonal/clean-architecture shape:

```
api/            → HTTP concerns: routes, controllers, middlewares, validators, permission constants
application/    → business logic (services) + port interfaces (contracts services depend on)
domain/         → entities (DB-row shaped), mappers (row → response), responses (client-facing DTOs)
infrastructure/ → concrete adapters: MySQL repos, file-backed repos, GCS storage, DB pooling, DI container
```

- `domain/entities` mirror raw DB rows (Spanish/PascalCase column names, e.g.
  `PacienteID`, `FechaNacimiento`). They're data shapes, not rich domain
  objects with behavior.
- `domain/mappers` are static classes translating entity shape → response
  shape (e.g. `PacienteID → id`, `Nombre → name`).
- `application/ports/*.repository.ts` are the interfaces services depend on
  (`findAll`, `findById`, `create`, `update`, `softDelete`, …). There's also a
  non-repository port, `file-storage.ts`, abstracting GCS.
- `application/services` hold business logic and are constructor-injected
  with **port interfaces**, not concrete repo classes — e.g.
  `PatientsService(private readonly patientsRepo: PatientsRepository)`.
- `infrastructure/repositories` implement those ports as either:
  - `Mysql*Repository` — raw SQL via `Database.execute`/`Database.query`
    (§6), or
  - `File*Repository` — JSON-file-backed (§10) that satisfy the *same* port
    interface but store data very differently.

**Where the pattern is consistent**: patients, staff, invoice, stock,
dashboard, citas (scheduling), clinical-attachments, auth, and permission
overrides are all cleanly MySQL-backed through this ports/adapters chain.

**Where it breaks down**:
- Billing ledger, beds, OR rooms, expedientes, patient movements/encounters,
  and user profiles are file-backed "repositories" behind the same port shape,
  but they store data in a single shared JSON file with no tenant scoping
  (§10) — a real gap relative to the MySQL-backed data.
- Permission overrides are a hybrid: modeled with `load()/save()` methods that
  *look* file-store-shaped, but are actually backed by per-tenant MySQL
  tables that get lazily `CREATE TABLE IF NOT EXISTS`'d on first access
  (`mysql-role-permissions.repository.ts`, `mysql-user-permissions.repository.ts`)
  — an on-demand table migration pattern, not a traditional migration runner.
- `AuthController` reaches into infrastructure directly (`PoolManager`,
  `TenantContext`) rather than going through a service, because tenant
  resolution for login/register has to happen *before* `authMiddleware` (and
  therefore before any `TenantContext` scope) exists.

## 3. Dependency wiring — service locator, not a DI framework

[src/infrastructure/container/service.container.ts](../src/infrastructure/container/service.container.ts)
is a hand-rolled **static-class service locator**. Every service/repo is a
lazy-singleton static getter:

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

Controllers call `ServiceContainer.getXService()` directly, either in their
constructor or as a field initializer — there is no framework-level IoC
container, no decorators-based injection, and no way to swap an implementation
without editing the container class itself. `GcsFileStorage` instances are
constructed directly (not memoized) inside `getClinicalAttachmentsService()`,
one per bucket (clinical vs public).

## 4. Routing & controllers

Routes live under `src/api/routes/*.route.ts`, one file per resource.
Composition: `app.ts` mounts `/public` (unauthenticated), `/app`
(`authMiddleware` applied once for the whole subtree, then sub-routers for
patients/visits/beds/or-rooms/invoice/billing/settings/scheduling/inventory/
attachments/dashboard), and `/auth` (login/register unauthenticated;
check-token/complete-password-change behind `authMiddleware`).

Per-route convention:
`requirePermissions(<perm>) → validators → [upload middleware] → controller method`.

**Two controller styles coexist**, which matters when reading or extending
either family:

1. **Manual style** (`PatientsController`, `AuthController`,
   `AttachmentsController`, `CitasController`): `(req, res, next)` methods,
   explicit `res.json(...)`, explicit `catch(err) { next(err) }`. Status codes
   and response envelopes vary per endpoint (200/201/202/206,
   `{data:...}` vs `{user, token}`).
2. **`@asyncHandler()` decorator style** (`BedsController`,
   `BillingController`, `DashboardController`, `InvController`,
   `InvoiceController`, `OrRoomsController`, `SettingsController`,
   `VisitsController`): methods return a value; the decorator
   ([src/api/decorators/asyncHandler.ts](../src/api/decorators/asyncHandler.ts))
   wraps it in a fixed envelope, `{ success: true, message: '...', data }`, at
   a fixed HTTP 200, and forwards thrown errors to `next(err)`.

There is no plan to unify these — just be aware which family a given
controller belongs to before assuming a response shape.

## 5. Validation

`express-validator` chains live in `src/api/validators/*.validator.ts`
(auth, billing, invoice, patients, settings, visits), all terminating in a
shared `handleValidationErrors` middleware that throws a
`{ name: 'validation_errors', errors: [...] }` object — the same error
convention services use for their own validation failures (§8), so both paths
produce identical `400 { message: [...] }` responses.

Coverage is uneven: patients/auth/billing/invoice/visits/settings have
dedicated validator chains; beds/or-rooms/citas/attachments/inventory
routes rely mostly on permission checks plus inline controller-level checks.

## 6. Database layer

Driver is `mysql2/promise`, no ORM. Every pool sets `dateStrings: true`
(returns MySQL dates as strings, avoiding JS `Date` timezone surprises).

- **Query files**: `src/infrastructure/database/queries/*.queries.ts`, one
  per domain, each exporting a `xQueries(key, ...args)` function that returns
  a raw SQL string via `switch(key)` (e.g. `'read' | 'read-one' | 'create' |
  'update' | 'soft-delete' | 'total-registries'`). Pagination values are
  interpolated directly into some query strings (not parameterized) — safe
  today only because callers coerce with `Number(...)` first; flag this if
  that discipline ever lapses.
- **Repositories**: `src/infrastructure/repositories/mysql-*.repository.ts`
  are thin — build a query via the matching `*.queries.ts` function, call
  `Database.execute<T>`/`Database.query<T>`, no business logic.
- **`Database`** class
  ([src/infrastructure/database/Database.ts](../src/infrastructure/database/Database.ts))
  pulls its pool from `TenantContext.getPool()` for every call (throws if no
  tenant context is active — see §7), retries once on stale-connection errors
  (`ECONNRESET`, `PROTOCOL_CONNECTION_LOST`, errno `-4077`), and implements an
  **ambient transaction** pattern: `Database.transaction(fn)` grabs a
  dedicated connection, begins a transaction, and re-enters
  `TenantContext.runWithConnection(connection, fn)` so nested
  `Database.execute` calls inside `fn` transparently reuse the same
  connection/transaction with no call-site changes needed.

### Schema

`schema.sql` is the per-tenant schema template (used when provisioning a new
tenant); `migration.sql` is an incremental, idempotent patch script for
bringing existing tenant schemas up to date (adds columns, converts
`facturas.Estado` from ENUM to VARCHAR, adds the clinical-attachment tables,
adds missing indexes). **The two files can drift** — e.g. the
`adjuntos_clinicos*` tables currently exist in `migration.sql` but aren't yet
folded into `schema.sql`'s canonical table list. Treat `migration.sql` as the
more current source when the two disagree, and reconcile them periodically.

Major table groups (per-tenant schema):
- **Identity/RBAC**: `roles`, `usuarios` (incl. `SessionVersion` — see §11.4),
  `personal` (staff, FK to `usuarios`).
- **Catalog**: `tipo_pago`, `servicios`.
- **Clinical**: `pacientes`, `historia_medica` (visits — vitals, `TipoVisita`
  ENUM).
- **Inventory**: `Inventario`, `Subinventario`, `ExistenciasInventario`,
  `Inventario_HistoriaMedica`, `Factura_Inventario`.
- **Billing**: `facturas` (Honduras fiscal fields `RTN`/`CAI`, discounts,
  `InvoiceNumber` unique).
- **Scheduling**: `citas` (appointments, external-calendar-sync fields).
- **Permission overrides**: `permiso_rol_overrides`, `permiso_usuario_overrides`
  (§7).
- **Clinical attachments**: `adjuntos_clinicos`, `adjuntos_clinicos_accesos`
  (§9).
- **Stored routines**: `sp_mov_inventario` (inventory transfer between
  sub-locations), `fn_dashboard_stats()` (JSON-returning dashboard stats,
  written to hit `idx_facturas_active_fecha`/`idx_historia_medica_active_fecha`).

The **global** `empresas` table (tenant registry, lives in `medit_global`) has
no DDL in this repo at all — it's provisioned out-of-band directly against
`medit_global`. Its shape is only inferable from `PoolManager`'s `Empresa`
interface: `CodigoEmpresa`, `NombreBaseDatos` (tenant schema name),
`ServidorDB`, `PuertoDB`, `Activo`.

## 7. Multitenancy

Schema-per-tenant. Shared DB is `medit_global`; each tenant has its own MySQL
schema (e.g. tenant `HNCAMI` → schema `cami-vime`).

**Resolution flow**:
1. Client supplies `codigoEmpresa` at login/register, or it travels in the
   JWT (`codigoEmpresa` claim) for subsequent requests.
2. `PoolManager.resolveEmpresa(codigoEmpresa)`
   ([src/infrastructure/database/PoolManager.ts](../src/infrastructure/database/PoolManager.ts))
   queries `medit_global.empresas` (uppercased key), throws `not_found_error`
   if missing or `inactive_company` if `Activo` is falsy.
3. `PoolManager.getPool(codigoEmpresa)` memoizes a per-tenant pool
   (`connectionLimit: 3, queueLimit: 20`) in an in-memory map keyed by
   uppercased tenant code. Idle pools (10+ min unused) are evicted by a
   5-minute sweep — `pool.end()` + map delete.
4. **`TenantContext`**
   ([src/infrastructure/database/TenantContext.ts](../src/infrastructure/database/TenantContext.ts))
   is an `AsyncLocalStorage<{pool, connection?}>` wrapper. `authMiddleware`
   calls `TenantContext.run(pool, next)` so every downstream repository call
   in that request's async chain resolves the right pool without threading it
   through every function signature. Login/register call
   `TenantContext.run(pool, ...)` manually themselves, since `authMiddleware`
   hasn't run yet at that point.
5. **Multer upload escape hatch**: Multer finishes on socket stream events,
   which escape the `AsyncLocalStorage` scope set by `authMiddleware`. The
   upload middleware explicitly captures `TenantContext.getPool()` *before*
   calling `multer.single()` and re-enters `TenantContext.run(pool, ...)`
   afterward — a subtle but necessary workaround, documented inline in
   `upload.middleware.ts`.

**Global vs. tenant-scoped queries** are distinguished purely by convention,
not by any automatic mechanism: `PoolManager.globalPool()` is used only for
the `empresas` lookup; everything else goes through `Database`, which always
pulls its pool from `TenantContext.getPool()` — so as long as a request went
through `authMiddleware` (or an explicit `TenantContext.run`), its queries are
inherently tenant-scoped.

**Known gap**: the file-backed repositories (§10) do **not** participate in
this scoping at all. They read/write one shared file regardless of which
tenant triggered the call — meaning billing ledger, patient
movements/encounters, beds, OR rooms, expediente-extras, and user-profile
data are effectively **global across every tenant sharing this backend
deployment**. This is the single biggest gap between the multitenancy
model's intent and its actual coverage.

## 8. Error handling

Centralized in
[src/api/middlewares/errorHandler.ts](../src/api/middlewares/errorHandler.ts),
the last `app.use` in `app.ts`. It's a name-tag dispatcher over `err.name`:

| `err.name`          | Status | Body                        |
|---------------------|--------|------------------------------|
| `validation_errors` | 400    | `{ message: err.errors }`   |
| `duplicate_entry`   | 401    | `{ message: err.message }`  |
| `not_found_error`   | 404    | `{ message: err.message }`  |
| `inactive_user`     | 403    | `{ message: err.message }`  |
| *(anything else)*   | 500    | `{ message: 'Internal Server Error' }` (logged via `console.error`) |

Note `duplicate_entry` maps to 401, not 409 — that's how it's implemented
today; don't "fix" it without checking what the frontend expects.

Services/controllers throw plain `Error` objects with a `.name` string tag
(no custom `Error` subclass hierarchy — everything is stringly-typed, so a
typo in an error name silently falls through to the generic 500 branch).
`buildError`/`buildValidationError` helpers are duplicated independently in
both `auth.service.ts` and `billing.service.ts` rather than shared.

**`inactive_company`** (thrown by `PoolManager.resolveEmpresa`) is a special
case: it's intercepted directly inside `auth.middleware.ts` and turned into a
401 *before* it would ever reach the shared `errorHandler` — so not every
tenant-resolution error flows through the same path as everything else.

## 9. Auth & JWT

Token issuance happens only in `AuthController.register`/`.login`
([src/api/controllers/auth.controller.ts](../src/api/controllers/auth.controller.ts)):

1. Client posts `{ email, password, codigoEmpresa }` (unauthenticated route).
2. Controller resolves the tenant pool via `PoolManager.getPool(codigoEmpresa)`.
3. Wraps the login/register call in `TenantContext.run(pool, () => ...)` so
   downstream repo calls hit the right tenant schema.
4. `generateToken(userId, codigoEmpresa, dbName, sessionVersion)`
   ([src/utils/jwtUtils.ts](../src/utils/jwtUtils.ts)) signs a JWT via
   `jsonwebtoken`, carrying claims `uid`, `codigoEmpresa`, `dbName`, `sv`
   (session version).

`SECRET_JWT_TOKEN`/`JWT_EXPIRES_IN` come straight from `config` (default
expiry `'2h'` if unset).

**Verification** (`src/api/middlewares/auth.middleware.ts`), applied to all
of `/app/*` plus `/auth/check-token` and `/auth/complete-password-change`:
1. Extract Bearer token; `verifyToken` distinguishes `TokenExpiredError`
   ("session expired") from a generically invalid token.
2. **Re-resolves** the tenant pool from the token's `codigoEmpresa` claim on
   every request (does not trust the `dbName` claim for pool selection) —
   this re-checks `Activo` on every request, so deactivating a tenant company
   takes effect immediately rather than only at next login.
3. **Session invalidation**: compares `usuarios.SessionVersion` (tenant DB)
   against the token's `sv` claim; mismatch → 401 "session expired."
   `incrementSessionVersion` runs on both login and register, so **every
   login invalidates all other outstanding tokens for that user** — this is
   single-active-session-per-login semantics, not true concurrent-session
   support. Keep that in mind before assuming a user can be logged in from
   two devices at once.
4. Attaches `req.user = payload` and re-enters `TenantContext.run(pool, next)`.

**No refresh-token mechanism exists.** There is a single access token with a
fixed TTL and the session-version check is the only invalidation lever. When
a token expires, the client must log in again.

## 10. Permissions

Permissions are a static, code-defined string union — not rows in a base
catalogue table — defined in
[src/api/permissions/permissions.ts](../src/api/permissions/permissions.ts):
`Permission` (the ~25 literal strings, e.g. `'patients.read'`,
`'visits.inventory.manage'`), `ALL_PERMISSIONS`, `ROLE_PERMISSIONS` (hardcoded
defaults per `RoleKey`: `admin | doctor | enfermera | recepcionista |
asistente`), and `normalizeRoleName`/`ROLE_ALIASES` (fuzzy-matches DB role
name strings, including accented Spanish, to a canonical `RoleKey`).

**Feature-gated permissions**: `FEATURE_GATED_PERMISSIONS` (currently just
`'visits.inventory.manage'`) is explicitly excluded from *every* role's
defaults, including admin's, so a new feature stays off for all tenants until
deliberately granted per tenant via overrides.

**Per-tenant overrides are real DB rows**, per-tenant, at two levels:

```sql
CREATE TABLE IF NOT EXISTS permiso_rol_overrides (
  rol_key VARCHAR(50) PRIMARY KEY, grants JSON NOT NULL, revokes JSON NOT NULL, updated_at VARCHAR(30) NOT NULL
);
CREATE TABLE IF NOT EXISTS permiso_usuario_overrides (
  usuario_id INT PRIMARY KEY, grants JSON NOT NULL, revokes JSON NOT NULL, updated_at VARCHAR(30) NOT NULL
);
```

**Resolution** (`AccessControlService.resolvePermissions(roles, userId)`):
1. Start from role defaults, unioned across all of a user's roles.
2. Apply role-level overrides (grants add, revokes remove).
3. Apply user-level overrides on top — these win last (highest precedence).

Every override change is logged (fire-and-forget) to `permiso_auditoria` via
`src/utils/permissionAudit.ts`.

**Enforcement**: `requirePermissions(...)` / `requireAnyPermission(...)` /
`requirePermissionsIf(predicate, ...)` middleware
(`src/api/middlewares/permission.middleware.ts`) resolve the current user,
resolve their effective permission set, and 403 if the required permission(s)
are absent. Applied per-route (one call per endpoint, by convention) — there
is no global enforcement layer, so a route missing an explicit
`requirePermissions` call is only gated by authentication, not authorization.

## 11. Clinical attachments (GCS storage)

[src/infrastructure/storage/gcs-file-storage.ts](../src/infrastructure/storage/gcs-file-storage.ts)
implements the `FileStorage` port over `@google-cloud/storage`, with a
lazily-created singleton `Storage` client. Two buckets:
`GCS_CLINICAL_BUCKET` (private clinical files) and `GCS_PUBLIC_BUCKET`
(public assets, e.g. tenant logos).

**Tables** (per-tenant, added via `migration.sql`): `adjuntos_clinicos`
(soft-delete only via `deleted_at` — "no hard deletes anywhere in this
feature" per an inline comment) and `adjuntos_clinicos_accesos` (a
per-view/download audit log, written before any bytes stream out).

**Upload pipeline** (`ClinicalAttachmentsService`):
- Size caps: 10MB for `in_app_camera`, 25MB for `file_upload`, enforced at
  both the multer layer and again in the service.
- **MIME whitelist enforced by magic-byte sniffing (via `file-type`), never
  by filename/extension** — jpeg/png/webp/pdf/msword/docx. Legacy `.doc`
  reports as `application/x-cfb` (OLE2 container); it's accepted only if the
  client *also* declared `application/msword`, so a renamed executable can't
  pass as a doc just by extension.
- Camera captures are always re-encoded through `sharp`: EXIF-orientation
  applied → resized to max 2048px width → re-encoded JPEG q85 → re-checked
  ≤3MB. `.withMetadata()` is deliberately *not* called, so EXIF/GPS metadata
  is stripped by default — relevant for clinical photo privacy.
- GCS object path convention: `{tenantCode}/patients/{patientId}/{timestamp}_{filename}`.
- **Tenant defense-in-depth**: `getForAccess(id, tenantCode)` re-checks that
  the stored `gcs_object_path` starts with `{tenantCode}/` even though the DB
  lookup is already tenant-scoped by the connection pool — belt-and-suspenders,
  and it's the one thing in this codebase with a dedicated unit test
  (`src/tests/clinical-attachments.validation.test.ts`, "tenant path defense
  in depth").
- Tenant logo upload is a simpler, separate path: validated as an image,
  converted to PNG, resized to fit 1024×1024, stored at a fixed public path
  `{tenantCode}/logo.png` — no DB row at all; the frontend constructs the
  public URL directly.

**Range/streaming support**: `src/utils/httpRange.ts` implements RFC 7233
single-range parsing (suffix/open-ended/closed ranges), used by
`AttachmentsController.stream` for both `/view` and `/download`, correctly
setting `Accept-Ranges`/`Content-Range` and 206/416 statuses.

### `file-type` pinned to v16

`package.json` pins `file-type` at `^16.5.4`. The likely reason (not stated
anywhere in-repo, so verify with the team before treating as settled fact):
`file-type` v17+ became ESM-only, which conflicts with this project's
CommonJS TypeScript build (`tsconfig.json`: `"module": "commonjs"`).
Upgrading would mean either converting the backend to ESM or using dynamic
`import()` around every call site — v16 was pinned instead as the last
CJS-compatible major.

## 12. Billing, encounters, movements & ledger — file-backed stores

**These are not MySQL tables.** They're plain JSON files under `data/*.json`
in the repo (`billing-ledger.json`, `patient-movements.json`,
`patient-encounters.json`, `expedientes.json`, `beds.json`, `or-rooms.json`,
`user-profiles.json`), read/written via `fs.promises`, and checked into git.
(`role-permissions.json`/`user-permissions.json` also exist here but look
vestigial — real permission data now lives in the MySQL override tables,
§10.)

Every file repo (`FileBillingLedgerRepository`, `FilePatientMovementsRepository`,
etc.) follows the same template: `load()` (mkdir -p, read, JSON.parse,
create-default on ENOENT), `save(store)` (full-file overwrite), and
`update(mutator)` which wraps `load → mutator → save` in a lock.

**Concurrency control** —
[src/infrastructure/utils/file-lock.ts](../src/infrastructure/utils/file-lock.ts)
is a **process-local, in-memory** promise-chain lock keyed by file path. It
only serializes `load→mutate→save` sequences *within a single Node.js
process*.

**Concrete risks this creates**:
1. **No cross-process safety.** If this ever runs with more than one worker
   (cluster mode, multiple container replicas), each process has its own
   independent lock map — two processes can both load, both mutate their own
   in-memory copy, and the second `save()` silently clobbers the first
   (lost-update race). Do not scale this service horizontally without
   addressing this first.
2. **Not tenant-scoped** (§7) — every tenant sharing this deployment reads
   and writes the *same* JSON files. The per-file lock still prevents a torn
   write within one process, but all tenants' data lives in one
   un-partitioned blob, which is a data-isolation and scalability concern on
   its own, independent of the race condition.
3. **No cross-store atomicity.** E.g. `BillingService.createManualCharge`
   touches the encounters store, then the ledger store, then makes a real
   MySQL call to increment the invoice amount, as three separate operations
   with no rollback across them — a crash mid-sequence leaves JSON stores and
   `facturas.Monto` inconsistent. (The MySQL side of that specific operation
   was deliberately made atomic — `UPDATE ... SET Monto = GREATEST(0, Monto +
   delta) WHERE Estado='Pendiente'` — precisely to avoid a read-then-write
   race on that one column; the JSON-file side has no equivalent safeguard.)
4. **Docker/deploy risk.** `Dockerfile` does `COPY data/ ./data/` at
   image-build time. Unless the deployment mounts an external volume over
   `/app/data`, runtime writes to these files are ephemeral to the container
   and will be lost on redeploy/restart/rescale, reverting to whatever was
   last committed to git. **Treat `data/*.json` as seed data, not durable
   storage, unless an external volume is confirmed in the deployment
   config.**

`BillingService` (`src/application/services/billing.service.ts`) is a genuine
hybrid: it cross-references real MySQL data (invoice ledger, inventory
ledger, invoice lookups) with the JSON-backed ledger/movements/encounters
stores to build a unified billing report, plus PDF report generation via
Puppeteer (`src/utils/pdfRenderer.ts`).

## 13. Config

[src/config/env.ts](../src/config/env.ts) loads `.env` via `dotenv` and
exports a plain object with `||` fallbacks — no schema validation (no zod/joi),
so a missing required var (e.g. `DB_USER`, `SECRET_JWT_TOKEN`) fails silently
at the point of use rather than at boot. Known rough edges:

- `DB_PORT` defaults to `'5432'` in `env.ts`, but `PoolManager` independently
  falls back to `'3306'` (MySQL's real default) wherever it actually uses the
  port — so the `env.ts` default is effectively dead/misleading. Don't trust
  it as documentation of the real default.
- `SECRET_JWT_TOKEN` defaults to `''` if unset — a silent, dangerous default
  in any environment where the env var isn't actually set.
- SMTP config (`SMTP_HOST/PORT/USER/PASS/FROM`) is read ad hoc directly from
  `process.env` inside `SettingsService.sendInviteEmail`, bypassing the
  central `config` object entirely. If any are unset, invite emails are
  silently skipped (`console.warn`, returns `false`) rather than failing
  loudly.
- There is no `.env.example` in the repo (`.env` is gitignored). The env vars
  actually in use, for reference:

  ```
  PORT, HOST, PUBLIC_BASE_URL
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SCHEMA
  SECRET_JWT_TOKEN, JWT_EXPIRES_IN
  GCS_CLINICAL_BUCKET, GCS_PUBLIC_BUCKET, GCS_KEY_FILE
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  ```

  `README.md`'s "Configuration" section only lists a subset of these (and
  incorrectly lists MongoDB as a requirement — this project is MySQL-only).
  Treat this document as authoritative over the README for env vars.

## 14. Testing

`npm test` runs `tsc && node --test "dist/tests/*.test.js"` — Node's built-in
test runner, no Jest/Mocha/Vitest.

Only one real automated test file exists:
`src/tests/clinical-attachments.validation.test.ts`, covering
`ClinicalAttachmentsService` via in-memory fakes (`FakeStorage implements
FileStorage`, `FakeRepo implements ClinicalAttachmentsRepository`) — MIME
whitelist/magic-byte sniffing, the sharp camera pipeline, upload input
validation, the tenant-path defense-in-depth check, and `parseRangeHeader`.
That the service can be tested this cleanly against fakes is a good sign for
the ports/adapters boundary in that one area.

`src/tests/range-harness.ts` is **not** an automated test — it's a manual
smoke-test server for Range-header behavior (`node dist/tests/range-harness.js`
+ `curl -H "Range: ..."`), excluded from the `node --test` glob by filename.

**Coverage gap** worth flagging explicitly: there is no test coverage for
auth/JWT, permission resolution (`AccessControlService`), multitenancy
(`PoolManager`/`TenantContext`), any MySQL repository, or the
billing/movements/encounters file-backed services — despite §12 above
describing real race conditions in exactly that last area. If this project
invests in tests next, that's the highest-value place to start.

## Known gaps summary

For quick reference, the structural issues called out above:

- File-backed stores (billing ledger, movements, encounters, beds, OR rooms,
  expedientes, user profiles) are **not tenant-scoped** and **not safe across
  multiple processes** (§12).
- `data/*.json` is not durable storage unless the deployment mounts an
  external volume (§12).
- No refresh-token flow; login invalidates all other sessions for that user
  (§9).
- No test coverage for auth, permissions, multitenancy, or any MySQL
  repository (§14).
- `schema.sql` and `migration.sql` can drift; `migration.sql` is currently
  more current for the clinical-attachments tables (§6).
- No CORS allowlist, no rate limiting, no request logging (§1).
- `README.md`'s configuration section is stale — this document supersedes it.
