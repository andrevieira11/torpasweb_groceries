# Decisions

Running log of non-obvious choices. Newest first.

## M5 — PWA polish + deploy

- **App icon**: one `src/app/icon.svg` mark (checked-list on brand emerald) rasterized by `sharp`
  (build-time devDep, `ops/make-icons.mjs`) into `public/` PNGs (192 / 512 / maskable-512 / apple-180).
  `manifest.ts` references them; `apple-icon` + `appleWebApp` set in metadata.
- **Service worker** (`public/sw.js`) is intentionally conservative: navigations are **network-first**
  (lists stay fresh) with an offline cache fallback; only content-hashed `/_next/static` + icons are
  cache-first. Registered client-side via a tiny `ServiceWorkerRegister`.
- **Dockerfile** is a 3-stage standalone build (`node:24-alpine`, non-root). The build stage sets
  **dummy env** so `next build` validates + bundles without real secrets (no DB is touched). The
  runner copies the standalone server + `.next/static` + `public` + `drizzle/` + `scripts/`, **plus the
  full `drizzle-orm` and `postgres` packages** — the migrator subpath isn't traced into standalone
  (the app never imports it). `CMD` migrates then serves. Verified: the built image migrates-on-start,
  boots, and answers the ingest webhook.
- **compose**: `db` (healthcheck + named volume `mrlist_pgdata`) → `app` (`pull_policy: always`, every
  env var mapped explicitly, Watchtower label) → `watchtower` (`--label-enable --cleanup --interval
  300`). Never `down -v`.
- **CI** (`.github/workflows/deploy.yml`): push to `main` → build + push `:latest` + `:sha` to GHCR
  using the automatic `GITHUB_TOKEN` (no extra repo secrets), with GHA layer cache.
- `ops/Caddyfile` host snippet (TLS + `X-Forwarded-*` → Secure cookies); `.gitattributes` forces LF
  (the image builds/runs on Linux); `migrate.mjs` silences postgres NOTICEs for clean deploy logs.

## M4 — Siri ingest webhook

- **One shared `ingestText` core** (`src/lib/items/ingest.ts`) does recipe-detect → parse →
  categorize → `applyItems`. Both the in-app `addItems` action and the webhook call it; `addItems`
  is now just a session + access wrapper. No parser logic is duplicated.
- **`POST /api/ingest`**: bearer token compared **constant-time** against `INGEST_WEBHOOK_TOKEN`;
  per-IP rate limit (60/min); body capped at 2 KB (declared `content-length` *and* actual length).
  Accepts JSON `{"text":"..."}` or `text/plain`. Targets the **earliest default list** (single owner
  for now), attributing items to "Siri". Returns `503` if the token isn't configured. `runtime` is
  pinned to `nodejs` (needs `node:crypto` + postgres-js).
- **Verified over HTTP**: 401 on missing/wrong token, item add with categorization, and `"add
  <recipe>"` expansion all work through the webhook.
- `docs/SIRI.md` documents the iPhone/HomePod Shortcut (Dictate → Get Contents of URL → POST), and
  is honest that zero-tap native Siri needs a native app — this Shortcut path is the realistic one.

## M3 — Sharing, guests, temporary lists

- **Active list via an httpOnly cookie** (`mrlist_active`), validated against access + liveness on
  every read, falling back to the default list. Every list gets an owner `list_members` row on
  creation, so `getUserLists` is a single membership→lists join.
- **One share-token table, two kinds** (`guest` / `member_invite`) via a `kind` column (migration
  0001). Tokens are 192-bit `base64url`. `resolveToken` is the **single trusted gate** — it checks
  kind, not-revoked, token-expiry, and list not archived/expired in one place; a token is reused per
  `(list, kind)` until revoked.
- **Guest = least privilege.** Guest actions take the **token** and derive the list from it — never a
  client-supplied list id. Guests can **add + check only** (no move/delete/clear); toggle verifies
  `item.listId === token's list`. Writes are rate-limited (30/min/token) and body-capped (≤500 chars,
  ≤20 items). Items are stamped with `addedByName`, no account. The guest page sends the client only
  item display data — never `ownerId` or other lists. Verified over HTTP (valid renders; unknown +
  revoked → invalid).
- **Member invite**: `/join/[token]` → if logged out, bounce to `/sign-in?next=/join/<token>` and back
  (the `next` redirect is guarded to same-origin paths to avoid open redirects) → join as member.
- **Temporary lists**: optional `expiresAt`; `isLive()` filters archived/expired on read; expiry shown
  relative via date-fns. Owner can't leave (delete instead); the default list can't be deleted.
- **Guest name** is prefilled by writing the input's DOM value in an effect (not React state), to
  satisfy the `set-state-in-effect` lint rule while still reading `localStorage` client-only.

## M2 — Recipes + "add &lt;recipe&gt;" expansion

- **Recipes are per-owner.** CRUD via server actions; on edit the ingredients are replaced
  wholesale (delete + re-insert) — simplest correct semantics for an editor.
- **"add &lt;recipe&gt;" detection** lives in `addItems`: only a single phrase (no `,`/`;`/newline)
  is considered, and it must match a saved recipe **exactly (normalized) or by Levenshtein ratio
  ≥ 0.85** (min length 3). Conservative on purpose — "milk" must not expand a recipe.
- **One merge path.** Both free-text add and recipe expansion build `IncomingItem[]` and go through
  `applyItems` → `planMerge` (pure, tested). Compatible quantities fold into existing *unchecked*
  rows; within-batch duplicates merge too. Verified on real Postgres (leite 5 l + 0.5 l → 5.5 l).
- **The recipe editor reuses the parser**: typing "2kg flour, 3 eggs, salt" runs `parseInput` +
  `categorize` client-side to pre-fill editable ingredient rows.
- **tsx caveats** (tests/smokes only, not the app): tsx's ESM loader doesn't resolve barrel
  `export *` named imports or the Next-provided `server-only` shim, so tests and smoke scripts import
  concrete modules (e.g. `@/db/schema/app`) and avoid `server-only` files.

## M1 — Parser, categorizer, list

- **Item identity = normalized name**: accent-fold + lowercase + strip punctuation + a light
  bilingual singularizer (irregular map for the cases generic rules break, e.g. EN potato/tomato vs
  PT limões→limão). Plural and singular collapse to one key so merge/categorize/learn are stable.
- **PT decimal comma vs comma-separator** (caught in a real-DB smoke): "0,5 L leite" was splitting
  into "0" and "5 L leite". Fix: protect `\d,\d` → `\d.\d` before comma-splitting in `parseInput`.
- **cuid2 ids are application-side** (`$defaultFn` in the Drizzle schema), not DB defaults. The app
  always inserts through Drizzle, so ids are generated; any raw-SQL insert must supply its own id
  (the seed only touches `categories`, whose PK is a stable string).
- **Merge-on-add**: a new item with the same normalized name as an existing *unchecked* one merges
  when units are compatible (sums; rolls up g→kg, ml→l), else a separate line. Same `quantity.ts`
  powers the M2 recipe merge. Never silently drops a quantity.
- **Learned rules belong to the list owner** (the list's memory), unique on
  `(owner_id, normalized_name)`, and override the dictionary. A manual category move teaches the rule.
- **Server actions** are zod-validated and tenant-scoped through `getAccessibleList` (owner or
  member); add is capped at 50 items.
- **Tests** run via `node --import tsx --test`; `*.test.ts` is excluded from tsconfig so `next build`
  doesn't type-check them. 24 pure-logic tests cover normalize, units/quantity-merge, categorize,
  and the parser.

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
