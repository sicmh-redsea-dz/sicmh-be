# MedIT schema compatibility review — 2026-10-22

**Result: the local backend and frontend are partially migrated, but are not compatible with the new dump as a whole. Inventory and consents have confirmed runtime blockers.**

## Scope and evidence

- Production reference: `C:/Users/joser/OneDrive/Documents/dumps/medittest_Dump20260922.sql`.
- Target contract: `C:/Users/joser/Downloads/Shared/medit-test-latest.sql` (dump header identifies database `sicmh`).
- Reviewed local `sicmh-be/src`, tenant/global Drizzle definitions, checked-in migrations, database selection, and sibling `sicmh-fe/src` including environments, inventory and visit forms, routing, and consent consumers.
- This is a static source/dump review. No database connection, SQL import, schema push, migration, deployment, or application-source change was performed. Only this report and the companion JSON were added.
- Dump comments and SQL were treated as evidence, not operating instructions. Row values are excluded from the companion JSON.
- Companion `schema-compatibility-2026-10-22.json` records hashes, complete table/column inventories and DDL constraints for both dumps, all runtime tenant models and indexes/FKs, missing columns, type differences, and migration coverage.

| Surface | Tables | Columns |
| --- | ---: | ---: |
| Production reference | 42 | 338 |
| New dump, including migration metadata | 55 | 602 |
| Backend tenant models | 49 | 537 |
| Checked-in initial tenant migration | 46 | — |

All 49 backend tenant table names exist in the target. Of those, 46 match the target column names, SQL types, and nullability; differences are concentrated in the three consent models. Boolean/tinyint(1) and whitespace were normalized for type comparison. This does not establish complete behavioral compatibility: active raw SQL, IDs, missing table integrations, provisioning, and constraints also matter.

## 1. High: the active inventory repository still uses the production schema

Evidence:

- `src/infrastructure/repositories/mysql-inv.repository.ts:7–40`
- `src/infrastructure/database/queries/inv.queries.ts:24–84`
- Wiring: `src/infrastructure/container/service.container.ts:349`, `src/api/routes/app.route.ts:28`, and `src/api/routes/inv.route.ts`.

This repository is active, not merely an obsolete query file. It reads and writes `Inventario` and `ExistenciasInventario`, selects Spanish columns such as `ProductoID`, `NombreProducto`, `PrecioUnidad`, `Cantidad`, and `SubinventarioID`, and calls `sp_mov_inventario`.

The target has `products`, `inventory_stock`, `inventory_locations`, `inventory_batches`, and `stock_movements`; it contains neither legacy inventory table nor that stored procedure. Listing, reading, creating, editing, and transferring inventory through `/app/inventory` will fail against an otherwise unmodified target database.

This requires structural adaptation, not a string rename: stock quantity belongs to a product/location record; product and location identifiers are UUID strings; creation cannot rely on numeric `insertId` or hard-coded location `1`; transfers need stock checks and atomic updates to the new structures. Preserve the existing frontend DTO names where appropriate through an adapter.

## 2. High: inventory IDs remain numeric across backend and frontend

Evidence:

- `src/api/controllers/inv.controller.ts:18,40,56`: numeric coercion of location/product IDs.
- `src/application/ports/inv.repository.ts:2–6`: numeric identifiers.
- `../sicmh-fe/src/app/dashboard/pages/inventory-page/inventory-page.component.ts:50,69–73`: location IDs `'1'` through `'4'`.
- `../sicmh-fe/src/app/dashboard/components/drawer-body-components/transfers/transfer.component.ts:10–11,33–36,82–83`: numeric destinations and origin `1`.
- `../sicmh-fe/src/app/dashboard/interface/article.interface.ts:2`, inventory service `updArticle`, and inventory form `itemId`: numeric product contract.

The target's location seeds use UUID identifiers and semantic codes (`main`, `outpatient`, `emergency`, `operating_room`). Numeric coercion corrupts UUID product IDs, while legacy location numbers cannot identify these rows. Merely converting types to string is insufficient: resolve the semantic location code to its actual tenant UUID.

The supplied target contains no seeded `hospitalization` location, although `src/scripts/seed.ts` defines one and the UI exposes hospitalization stock. This is a seed-data gap in the supplied snapshot, not an absent table definition.

## 3. High: visit stock lookup and consumption receive legacy location numbers

Evidence:

- `../sicmh-fe/src/app/dashboard/dashboard-routing.module.ts:85–87,142–144,199–201` supplies location numbers `3`, `4`, and `2`.
- `../sicmh-fe/src/app/dashboard/pages/visits-v2-form-page/visits-form-page-v2/visits-form-page-v2.component.ts:46–48,181–182,501–507,625–631` sends these for stock lookup and on each submitted stock item.
- `src/infrastructure/repositories/mysql-visits.repository.ts:205–214` compares the supplied value directly with `inventory_stock.location_id`.
- `src/infrastructure/repositories/mysql-stock.repository.ts:45–65` uses the submitted `subinventoryId` directly for quantity reduction.

With the supplied UUID location seeds, stock lookup using `'2'`, `'3'`, or `'4'` returns no matching rows. Submitting stock with one of these values makes reduction fail with the insufficient-stock error even when the actual UUID location has stock. The default `main` resolver only helps when the caller omits an explicit location.

## 4. High: consent models reference seven nonexistent columns

Evidence: `src/infrastructure/database/schema/tenant.ts:657–709` and active `src/application/services/clinical-documents.service.ts:143–240,313–438,562–595`.

| Model table | Code expects | Target provides / required adaptation |
| --- | --- | --- |
| `consent_templates` | `current_version` | `current_version_number` |
| `consent_template_versions` | `template_id` | `consent_template_id` |
| `consent_template_versions` | `version` | `version_number` |
| `consent_instances` | `template_id` | `consent_template_id` |
| `consent_instances` | integer `template_version` | UUID `consent_template_version_id`; resolve the actual version row |
| `consent_instances` | `attachment_id` | `clinical_attachment_id` |
| `consent_instances` | `printed_at` | No direct target column; define how print timing is represented |

Drizzle selects based on these definitions, so template/instance reads can fail before any insert. Current create/update/print/accept flows also write the obsolete names.

Renaming alone will not fix inserts:

- `consent_templates.created_by` is required, has no default, and is not modeled or supplied.
- `consent_template_versions.created_by` is also required and missing from writes.
- `consent_instances` additionally requires `consent_template_version_id`, `template_name`, `snapshot_json`, and `created_by`; current writes do not supply them.
- Other target-only instance fields are `signer_email`, signature/stamp object paths, `document_sha256`, and `accepted_by`. These are not persisted by the current model.

Frontend impact: company consent-template settings and visit consent list/print/accept operations use this active service. DTO names such as `current_version` can remain an API compatibility layer; the database mapping and writes must change.

## 5. Medium: consent types, uniqueness, and relationships differ too

| Contract | Current model | Target |
| --- | --- | --- |
| Template name capacity | varchar(200) | varchar(160) |
| Version content | text | mediumtext |
| Instance signer type | varchar(30) | enum('patient','guardian') |
| Signer identification | varchar(50) | varchar(100) |
| Signer phone | varchar(30) | varchar(50) |
| Consent base dates | timestamp | datetime |
| Instance accepted date | timestamp(3) | datetime |
| Unique template name | Enforced in model | No unique constraint in target |
| Unique encounter/template instance | Enforced in model | No equivalent unique constraint in target |
| Instance encounter FK deletion | cascade | restrict |
| Version template FK deletion | cascade on old column | restrict on renamed column |
| Instance attachment FK deletion | set null on old column | restrict on renamed column |

The service uses `onDuplicateKeyUpdate()` to reuse an instance for an encounter/template. Once column mapping is fixed, that behavior still will not work as intended: target rows have no unique encounter/template key, and the application generates a new UUID for each insert. Decide whether the new structure intends multiple historical instances or one reusable instance, and implement that choice explicitly.

The target also adds creator/acceptor/version foreign keys absent from the model. Full DDL constraints are in the JSON. Regular index column layouts differ on the consent tables as well; they should be aligned with the intended query patterns.

## 6. Medium / capability gaps: five application tables have no backend model

| Target table | Current behavior / consequence |
| --- | --- |
| `audit_logs` | No tenant model or source integration found. Permission-specific auditing uses the separate `permission_audit_logs`; it does not implement the general audit table. |
| `document_deliveries` | No model or queue/claim/retry integration found; the new delivery lifecycle is unused. |
| `invoice_number_sequences` | No model or sequence allocator. `src/application/services/invoice.service.ts:39` uses `generateShortenedUuid()` from `src/helper/uuidGen.ts` instead. Sequence/range tracking is unused. |
| `password_reset_tokens` | No model. `src/application/services/auth.service.ts:100–153` uses signed reset tokens and session-version invalidation instead of persisted token hashes/expiry/used-at records. Password reset is implemented differently, not necessarily broken. |
| `resource_types` | No model/catalog integration. Appointment code handles bed/operating-room types directly. This table is unused, not proof that appointment creation fails. |

`__drizzle_migrations` is also absent from application models, appropriately: it is tool-managed metadata.

These gaps must be classified by intended product behavior. A target table's presence alone does not prove the application must use it, but the current implementation does not exercise these new contracts.

## 7. High for fresh setup: checked-in migrations cannot recreate the target

`drizzle/tenant/0000_same_wind_dancer.sql` creates 46 tables. The tenant migration journal contains only that migration. Eight target application tables are missing:

`audit_logs`, `consent_instances`, `consent_template_versions`, `consent_templates`, `document_deliveries`, `invoice_number_sequences`, `password_reset_tokens`, `resource_types`.

The target's migration record carries the same hash as this initial migration (`e99e04c8ab750e9bae04c0c9a410fac6f3006503b68d4e517560dc725ebb09c5`). Thus the dump contains schema additions not represented by the checked-in migration history. A successful `db:migrate:tenant` on an empty database will not produce the target schema; running it against this dump will not reconcile those additions either.

The three consent tables already exist in current TypeScript models, but not in the checked-in migration. The five other application tables are absent from both. Do not use an unreviewed schema push as a reconciliation shortcut: it would use the incompatible current models as its desired state.

## Database and frontend destination: what is actually established

- Local `.env` selects global schema `medit_global`; no local `DB_TENANT_SCHEMA` entry was found. The latter is required by tenant migration/provisioning/seed scripts, but is not how request-time tenant selection works.
- `src/infrastructure/database/PoolManager.ts:80–112` resolves the company in `medit_global.companies` and opens the tenant database named by `companies.database_name`.
- The new dump identifies itself as `sicmh` and does not include the global `companies` table. Neither dump can prove that the company's live mapping points to this database. That requires a separate read of the global database and a runtime schema check.
- Frontend development environment calls `http://localhost:3000`; the production environment calls `https://medit-be-520183254912.us-central1.run.app`. `angular.json` replaces the environment file in production builds. There is no direct frontend database connection to repoint.
- No deployment revision, deployed frontend bundle, live company mapping, or live tenant DDL was inspected. Findings apply to the current local source and supplied target dump.

## What already aligns, and stale code that is not an active failure

- Patients, staff, authentication, appointments, invoice queries, dashboards, stock operations, attachments, encounter/vitals, medical records, beds, operating rooms, patient movements, permissions, and profiles use the new Drizzle models in their current repositories.
- For the 46 non-consent modeled tables, the comparison found no missing/extra columns, SQL-type or nullability differences. Model-declared FK targets/actions and unique-index column sets were also checked against the dump; the discrepancies found were in consent tables. This is structural coverage, not end-to-end certification of each module.
- Spanish response fields such as `PacienteID` are often deliberately populated from English schema properties by adapters (for example `mysql-patients.repository.ts:8–19`). They are not automatically legacy SQL errors and do not all need to be renamed in the frontend.
- Several `src/infrastructure/database/queries/*.queries.ts` files still contain old Spanish SQL, old views, or `fn_dashboard_stats()`. Current repository imports show only `inv.queries.ts` is used as a legacy SQL query module. The other files are stale-code risk, not confirmed reachable database failures.
- The production reference defines four views (`InvoiceView`, `facturacondescuentos`, `totalmontobypaymentmethod`, `vw_consumo_inventario`); the new dump defines none. Current invoice/dashboard repositories use Drizzle computations rather than these views. External consumers were outside this review.

## Verification and next implementation order

Passed: backend `npm run type-check`; frontend `npx tsc --noEmit -p tsconfig.app.json`. These checks do not execute SQL or validate a deployed database.

Recommended order:

1. Align consent models and services with the target, including required actor/snapshot/version data and instance-history semantics.
2. Rewrite the active inventory repository for products/location stock and transactional transfers.
3. Expose a tenant location catalog or resolve stable location codes; replace legacy frontend location numbers and numeric product IDs across inventory and visit stock flows.
4. Decide and implement the five currently unused application-table capabilities as required by the product.
5. Add reviewed migrations that reproduce the agreed target from an empty database and upgrade an existing one.
6. Validate against an isolated copy of the target: company routing, inventory CRUD/transfers, each visit module's stock, consent templates/printing/acceptance, and relevant billing/reset/delivery/audit behavior. Verify deployed artifacts separately before any production cutover.
