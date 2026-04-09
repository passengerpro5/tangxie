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
node --experimental-strip-types --test apps/miniprogram/tests/runtime-config.spec.ts
node --experimental-strip-types --test apps/miniprogram/tests/home-runtime.spec.ts
node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts
```

### Admin Console Workflow

`apps/admin` now ships a real React + Vite runtime for the AI management console.

Install the admin dependencies first:

```bash
cd apps/admin
npm install
```

Start the admin dev server:

```bash
npm run dev
```

Build the admin app:

```bash
npm run build
```

Run the admin tests:

```bash
npm test
```

By default the browser app calls `http://127.0.0.1:3000`. To point the console at a different API, start Vite with `VITE_ADMIN_API_BASE_URL` set to the desired backend origin.

### Mini Program Workflow

`apps/miniprogram` now includes a WeChat `App/Page` runtime path for the arrange flow instead of only model-level shell code.

Run the local mini program tests:

```bash
node --experimental-strip-types --test apps/miniprogram/tests/runtime-config.spec.ts apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/arrange-flow.spec.ts apps/miniprogram/tests/smoke.spec.ts
```

Start the backend first:

```bash
cd apps/api
npm install
node --experimental-strip-types src/main.ts
```

Then open WeChat DevTools and import the mini program project from:

```bash
apps/miniprogram
```

Local API behavior:

- The default API base URL is `http://127.0.0.1:3000`.
- To point DevTools at another backend, run `wx.setStorageSync('TANGXIE_RUNTIME_API_BASE_URL', 'http://<your-host>:3000')` in the DevTools console, then reload the mini program.
- To clear the override, run `wx.removeStorageSync('TANGXIE_RUNTIME_API_BASE_URL')` and reload.

Expected local flow in DevTools:

1. Open the home page and tap `安排任务`.
2. Enter task text and submit to trigger intake.
3. If the backend asks follow-up questions, answer them in the sheet.
4. Confirm the proposed schedule and let the page refresh the home timeline.

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
- The new admin React shell uses the same `/admin/ai/*` endpoints and can run against either the in-memory or Prisma-backed API path.

### Layout

- `apps/miniprogram` - WeChat mini program client
- `apps/admin` - React + Vite AI provider/model/prompt admin console
- `apps/api` - backend API and scheduling service
- `packages/shared` - shared types and constants

## Environment

Copy `.env.example` to `.env` for local development and fill in the values for your environment.
