# Decisions

Running log of non-obvious choices. Newest first.

## M0 — Scaffold, design system, schema, auth, shell

- **Next.js 16.2.9 / React 19.2.4.** `create-next-app` pinned these. Turbopack is the **default**
  bundler for both `next dev` and `next build` in 16 — plain `next build` already uses it (opt out
  with `--webpack`). Middleware was renamed to **proxy** (`proxy.ts`); we don't use it yet.
- **Scaffolded into `mrlist-tmp/` then merged up.** Root had non-whitelisted files (`CLAUDE.md`,
  `AGENTS.md`, `.env.example`) that block `create-next-app`. Dropped its generated `CLAUDE.md` /
  `AGENTS.md` (kept ours).
- **Better Auth Drizzle adapter is built in** at `better-auth/adapters/drizzle` — the older separate
  `@better-auth/drizzle-adapter` package is not needed (Context7 examples were stale). Verified
  against installed `better-auth@1.6.19`. Core tables (`user`/`session`/`account`/`verification`)
  are hand-written in `src/db/schema/auth.ts` to the exact field shapes the adapter expects; the
  adapter maps models by **JS property name**, so the camelCase keys are load-bearing and the
  snake_case SQL column names are free.
- **postgres-js driver**, single lazy connection reused across dev hot-reloads (`src/db/client.ts`).
  Constructing `postgres(url)` does not dial the DB, so importing the client during `next build` is
  safe without a live database. DB-reading routes are dynamic (they read the session via
  `headers()`), so `next build` never queries.
- **Env validation** (`src/env.ts`) is presence-checked with zod at import. Build provides dummy
  values (local `.env`, and a build-time `ENV` in the Dockerfile later) so `next build` passes
  without real secrets; real values are injected at runtime.
- **Categories are a seeded table keyed by a stable string** (`produce`, `dairy`, …). Single source
  of truth in `src/lib/categories.ts`, mirrored in `scripts/migrate.mjs` (plain ESM can't import TS).
  Items/recipe-ingredients FK to `categories.key` with default `other`. Colors limited to a reused
  5-hue palette (`--cat-*`).
- **Tenant = list** baked into the schema now: `list_id` + indexes on every tenant table,
  `list_share_tokens` for guest access, `categorize_rules` unique on `(owner_id, normalized_name)`.
  Enforcement of access lands with the queries in M1+.
- **Tailwind v4 CSS-first**: tokens on `:root` / `.dark`, mapped via `@theme inline` so
  `bg-surface` / `text-fg` / `border-hairline` utilities follow the theme. Class-based dark via
  `@custom-variant dark (&:where(.dark, .dark *))` + next-themes (`attribute="class"`).
- **Quantities** stored as `double precision` (`qty`) + free-text `unit` — simple arithmetic for the
  M2 merge; nullable, never silently dropped.
