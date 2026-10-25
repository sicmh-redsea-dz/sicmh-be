# First schema compatibility fixes — 2026-10-22

Implemented locally in `sicmh-be` and `sicmh-fe`. Production, live tenant routing, and both supplied SQL dumps are unchanged. The original audit report describes the pre-fix state.

## Completed

- All 54 application tables and 599 application columns now have tenant models matching the target names, SQL types, and nullability. The migration metadata table is intentionally excluded.
- Consent models use the target's version UUID, creator/acceptor foreign keys, snapshot, hash, attachment mapping, datetime columns, and indexes. Template creation and version changes are transactional; concurrent updates allocate distinct versions.
- Consent printing/acceptance creates historical instances instead of relying on a nonexistent encounter/template unique constraint. A reprint cannot erase an accepted instance. Physical uploads lock the instance and reject duplicate acceptance or a changed patient/doctor.
- Inventory CRUD uses `products` and `inventory_stock`; product IDs remain UUID strings through both applications. Transfers perform conditional deductions, destination updates, and a `stock_movements` insert in one transaction. Invalid quantities, same-location transfers, and insufficient stock are rejected.
- Inventory and visit forms send stable location codes. The backend resolves codes or UUIDs against each tenant and accepts legacy location aliases for older clients during rollout.
- Visit creation now propagates its Drizzle transaction through repository calls and nested savepoints, covering invoice/visit creation and stock writes rather than opening an unrelated raw-SQL transaction.
- `0001_align_target_schema.sql` plus its Drizzle snapshot/journal supplies the eight missing application tables. It is tested both after the initial migration and against a definitions-only copy of the supplied target with the initial migration recorded.
- Test discovery follows current source files, excluding orphaned compiled tests left in `dist` from previous checkouts without deleting output.

## Validation

- Backend compilation and the complete current test suite: 33 passing tests, no failures or skips when opting into integration tests.
- Real isolated MySQL 8.0.46: fresh migration schema matches the target's columns, types, nullability, defaults, automatic update behavior, and FK contracts. Existing target tables remain unchanged when applying the new migration. All 54 runtime models can query the target.
- Database workflow tests cover UUID inventory CRUD, zero stock, movement audit, invalid/insufficient transfers, concurrent transfers, code/legacy-alias stock lookup and consumption, outer transaction rollback, consent version concurrency, snapshots/hashes/actors, reprint history, and concurrent physical acceptance.
- Static fixture test checks all 599 model columns against definitions extracted from the supplied target; the fixture contains no row data.
- Frontend `npm run build` passed, including its production environment replacement.
- Consent database tests stub PDF rendering and cloud storage. Browser interaction, real document rendering/upload, and deployed artifacts have not been verified by this change.

## Remaining work

- The new models for general auditing, document deliveries, invoice number sequences, reset-token persistence, and resource types now exist, but the corresponding business workflows have not been switched to these tables. In particular invoice numbers still use the existing shortened UUID generator, and password reset still uses signed tokens/session versions.
- The supplied dump has no hospitalization inventory location. Run the existing reviewed seed process in the intended test tenant before testing that stock flow; the application now reports a missing-location configuration error instead of silently using a numeric location.
- The migration supports the initial 46-table schema and the supplied new target. It does not transform the stable legacy production schema or backfill production IDs/data, and it does not convert incompatible intermediate consent tables. MySQL DDL is not transactionally reversible; validate the destination before applying.
- Company-to-tenant database mapping, production deployment/revision checks, and the actual application smoke test remain separate from these local fixes.

See `README.md` for the isolated test command. No migration or seed command was run against application databases.
