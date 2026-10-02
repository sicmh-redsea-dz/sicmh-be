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

## Database

Apply pending Drizzle migrations to the global and tenant databases.

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
