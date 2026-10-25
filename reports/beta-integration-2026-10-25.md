# Beta-v0.0.1 integration - 25 October 2026

Merged remote backend commit `e397bd8` with local work through `c31c382`, including autosave/session support and prescription titles. Frontend commit `835bb98` was already pushed with the requested subject: `Agregado el auto-guardado, mejora receta medica`.

Retained remote normalization, aggregate transaction locks, batch inventory, SAR sequences, reset-token persistence, audit and document delivery tracking. Preserved local clinical profiles, optional patient/visit fields, location permissions, report reconciliation, doctor catalog, consent signer validation, historical snapshots, and prescription titles. Visit creation includes the financial trail in its transaction; editing preserves original billed prices when quantities decrease.

The canonical remote migrations 0000-0003 remain unchanged; 0004 adds local clinical extensions and backfills consent version identities. The divergent local migration files are archived, not executed in the canonical chain. The tenant migration command rejects divergent SQL histories before DDL; see `docs/migrations/README.md`. Existing staging/local databases on the old local chain require a separate data migration before deployment. No existing application or staging databases were modified.

Validation:

- Backend full suite with schema and session database tests enabled: 92 passed, zero failed/skipped, using a dedicated MySQL 8.0.46 container on loopback port 33316 and generated databases. This includes fresh migrations, independent SQL replay, schema queries, divergent-history rejection, profiles, visits, concurrent inventory edits/payments, rollbacks, consent history and session version allocation.
- Remote MySQL integration suites on a separately generated, migrated and minimally seeded database: 6 reported-table tests and 12 normalization tests passed. Includes a real visit with its billing trail, price-preserving stock corrections, concurrent allocations, lot returns, reset-token single use and document outcomes.
- Frontend staging build and all 32 frontend tests passed before push.
- Final TypeScript and migration preflight regression checks run after the last integration edits.

All generated test databases were removed by their test harnesses. No deployment was performed.
