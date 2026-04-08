# 糖蟹

糖蟹是一款帮助个人用户把任务自动排期并按时提醒的小程序产品。

## Workspace

This repository uses a pnpm workspace.

### Root scripts

- `pnpm install`
- `pnpm run smoke`
- `pnpm test`
- `pnpm run lint`
- `pnpm run build`

### Local Checks

Run the lightweight smoke suite from the repository root:

```bash
pnpm run smoke
```

The smoke suite validates the core lifecycle across the API, admin shell, and mini program shell. It uses Node's built-in test runner with `--experimental-strip-types`, so it does not require WeChat tooling or a browser build.

For targeted checks, run the app-level tests directly:

```bash
node --experimental-strip-types --test apps/api/test/app.e2e-spec.ts
node --experimental-strip-types --test apps/api/test/smoke.e2e-spec.ts
node --experimental-strip-types --test apps/admin/tests/smoke.spec.ts
node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts
node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts
```

### Local Prisma Workflow

`apps/api` now supports a local embedded Postgres flow for DB-backed verification.

Install API dependencies first:

```bash
cd apps/api
npm install
```

Start the local database and push the Prisma schema:

```bash
npm run db:local:start
npm run db:local:push
```

Run the DB-backed admin-ai API checks:

```bash
npm run test:admin-ai:db:local
```

Run the admin client integration tests against the same local database:

```bash
cd ../api
node scripts/with-local-db.mjs --cwd=../admin npm test
```

Notes:

- The embedded database writes temporary state under `apps/api/.local/`.
- In restricted environments, starting the local database or running DB-backed tests may require execution outside the sandbox.
- `createAppHandler()` uses Prisma for `admin-ai` when `DATABASE_URL` is present, and falls back to in-memory storage otherwise.

### Layout

- `apps/miniprogram` - WeChat mini program client
- `apps/admin` - AI provider/model/prompt admin console
- `apps/api` - backend API and scheduling service
- `packages/shared` - shared types and constants

## Environment

Copy `.env.example` to `.env` for local development and fill in the values for your environment.
