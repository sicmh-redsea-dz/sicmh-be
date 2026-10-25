# sicmh-be

Backend API built with Node.js, Express, MySQL, and Drizzle.

## Requirements

Install Node.js 22+ and Docker Desktop.

## Quick Start

Copy the local environment template.

```sh
cp .env.example .env
```

Install dependencies.

```sh
npm install
```

Start the local MySQL container.

```sh
docker compose up -d
```

Create the databases, run Drizzle migrations, and seed initial data.

```sh
npm run db:setup
```

Start the API in development mode.

```sh
npm run start:dev
```

Run a type check before pushing changes.

```sh
npm run type-check
```

`npm test` compiles and runs only tests with current source files; stale tests
left in `dist` from other checkouts are excluded. MySQL compatibility tests are
opt-in and use only an isolated server at `127.0.0.1:33316` (root, empty password).
They never use application database credentials. For a disposable local server:

```powershell
docker run --detach --rm --name medit-schema-check --publish 127.0.0.1:33316:3306 --env MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:8.0
# Wait for MySQL to report ready, then:
$env:RUN_SCHEMA_INTEGRATION_TESTS = '1'
npm test
Remove-Item Env:RUN_SCHEMA_INTEGRATION_TESTS
docker stop medit-schema-check
```

The tests create and remove uniquely named test databases and import only schema
definitions from the checked-in fixture. PDF rendering and cloud object storage
are stubbed in the consent database tests.

## Database

Apply pending Drizzle migrations to the global and tenant databases.

`0001_align_target_schema` adds the eight application tables absent from the
initial migration and preserves tables already present in the supplied new dump.
It supports that target or the initial 46-table schema; it does not rename tables
or migrate legacy production data or incompatible intermediate consent schemas.
Set `DB_TENANT_SCHEMA` for migration/seed scripts. Runtime tenant selection still
uses `medit_global.companies.database_name`.

Inventory callers may supply location UUIDs or stable codes (`main`, `outpatient`,
`emergency`, `operating_room`, `hospitalization`). The existing seed script creates
these locations; the supplied new dump lacks a hospitalization location. Legacy
numeric aliases are resolved by the backend for older clients during rollout.

```sh
npm run db:migrate
```

Push schema changes directly to the local databases.

```sh
npm run db:push
```

Generate a versioned tenant migration after changing the Drizzle schema.

```sh
npm run db:generate:tenant
```

See [reported table resolutions](docs/reported-tables-resolution.md) for consent
tables, document delivery records, password reset persistence, audit logs, SAR
numbering configuration, and the replacement for `historia_medica.isActive`.

Run unit tests and, with the local development MySQL tenant available and idle,
the integration checks.

```sh
npm test
npm run test:mysql
```

See [database normalization and schema](docs/database-normalization.md) for the
patient ownership constraints, transaction boundaries, inventory lots, resource
assignments, migration sequence, and integration test scope.

To erase the configured local development databases and rebuild them with only
initial catalogs and company configuration:

```sh
npm run db:reset:local -- --confirm-delete-local-data
```

This reset refuses remote hosts, production mode, system database names, and a
global registry containing other tenants. It does not create additional containers
or volumes. The normalization migrations are validated for rebuilding from empty
databases; they are not a data-preserving upgrade procedure for an old installation.
