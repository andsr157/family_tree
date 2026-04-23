# AGENTS.md

## Package Build Order

Shared packages must be built before apps that depend on them:

```
pnpm build:packages   # builds @family-tree/schemas then @family-tree/types
```

`pnpm dev` does this automatically. `pnpm build` in `apps/api` also runs `-w build:packages` first.

## Developer Commands

```bash
pnpm dev              # build packages + run both apps in parallel
pnpm dev:web          # frontend only (port 5173, proxies /api → :3000)
pnpm dev:api          # backend only (port 3000, prefix /api)

pnpm build            # parallel build all packages
pnpm build:packages   # build shared packages only
pnpm build:api        # build api (includes build:packages)
pnpm build:web        # build web

pnpm lint             # parallel lint all packages
pnpm lint:fix         # parallel lint + auto-fix
pnpm typecheck        # parallel typecheck all packages
pnpm format           # format all .ts/.vue/.json files
pnpm format:check     # check formatting only
```

## Database (Drizzle ORM + PostgreSQL)

```bash
pnpm db:push          # push schema to DB (dev)
pnpm db:generate      # generate migration files
pnpm db:migrate       # run migrations
pnpm db:seed          # seed data
pnpm db:studio        # open Drizzle Studio
```

Schema files live in `apps/api/src/db/schema/`. Casing is `snake_case`.

Required env vars for local dev:

- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://localhost:6379`

## Monorepo Structure

| Package            | Entry                | Notes                            |
| ------------------ | -------------------- | -------------------------------- |
| `apps/web`         | `vite`               | Vue 3, Tailwind CSS 4, port 5173 |
| `apps/api`         | `nest start --watch` | NestJS, port 3000, prefix `/api` |
| `packages/schemas` | `dist/index.js`      | Zod schemas                      |
| `packages/types`   | `dist/index.js`      | TypeScript types                 |

## Architecture Notes

- All API routes prefixed with `/api` (setGlobalPrefix in `main.ts`)
- `@CurrentUser` and `@CurrentTenant` decorators for request context
- Redis service in `src/core/redis/`
- Frontend Vite proxy: `/api` → `http://localhost:3000`

## LeanCtx Mode

leanctx.auto=true

## Caveman Mode

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging.
Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.
Code/commits/PRs: normal. Off: "stop caveman" / "normal mode".
