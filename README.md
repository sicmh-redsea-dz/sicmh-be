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
