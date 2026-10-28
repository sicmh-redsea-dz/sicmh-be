# Integrated Beta-v0.0.1 migration history

The merge retains the remote canonical migrations 0000 through 0003 unchanged. Migration 0004 adds the local patient identification type, notes, clinical-profile versions and reviews, doctor gender, and consent history metadata. Both code histories are preserved by the merge commit.

The former local 0001 through 0004 SQL files are retained under `local-legacy/` for reference, outside the active migration directory. Their numbers overlap the remote normalization migrations and must never be mixed in one Drizzle journal.

`npm run db:migrate:tenant` verifies every applied migration hash and timestamp before executing any tenant DDL. A database initialized from the canonical remote history can migrate normally. A database initialized from the former local history is rejected without migration changes. Do not bypass the check or rewrite its migration journal.

Existing local/staging databases using that legacy history require a separate, reviewed data migration or export/import into the canonical schema. That transition is not performed by this Git merge. Preserve the database and its original journal; do not reset it. The staging deployment runs the guarded command through `db:setup` and stops when the histories diverge.

Validation uses an isolated MySQL container and generated databases, with no application databases modified. The schema tests now verify the canonical normalized schema, retained local patient contracts, clinical profiles, consent snapshots, inventory, transactional visit edits, payment rollback, and rejection of divergent migration histories. The old fixture remains as historical input; it is not presented as the canonical normalized schema.

## Inventory fields and standard locations (0005)

Migration `0005_inventory_product_details` adds nullable product-level purchase price and expiration date. Existing records remain unknown (NULL); unit/selling prices remain separate. These fields are descriptive product metadata, not batch-level expiry enforcement. Supplier and batch workflows are deferred.

It also inserts missing standard inventory locations and reactivates matching deleted locations, preserving existing IDs, names and stock. Apply through `npm run db:migrate:tenant` against the intended tenant before deploying the updated application. The existing migration-history guard remains required.
