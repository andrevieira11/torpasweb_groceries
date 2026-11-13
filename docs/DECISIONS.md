# Decisions

Running log of non-obvious choices. Newest first.

## Dishes — pre-deploy fixes (2026-11-13, same day)

Checked against the shape of the live data (every real dish name starts with an emoji —
"🍟 Fish & chips (miúdos)" — and the 0004 backfill leaves `emoji` NULL). No schema or data change.

**One display helper.** `dishDisplay(dish) → { icon, label }` (`lib/items/dish-emoji.ts`) is used
by the dish card, the ⋯ sheet title (`dishTitle`), the aisle view's dish tag (also its emoji-only
form under 400 px) and the move-to-dish chips. Emoji NULL + a name that starts with an emoji →
that emoji is the icon and the label is the rest ("🍟" + "Fish & chips (miúdos)", never 🐟 +
"🍟 Fish & chips"); otherwise the suggestion from the name. A picked icon drops the name's own
copy only when it is the same emoji. An emoji-only name ("🍕") stays the label with the plain
icon. The icon pickers (rename, new dish) suggest `autoEmoji(name)`; when that emoji isn't in the
16-emoji palette (🍟, 🌯) it gets its own first tile, and picking it means "automatic" (null) —
so nothing outside the palette is ever saved and the zod enum stays as it is.

**A leading emoji doesn't make a new dish.** `sameDish` ignores one leading emoji (with VS16,
skin tone, ZWJ parts or a flag) when the rest has letters or digits: "Bacalhau com natas (17)"
typed or dictated = "🐟 Bacalhau com natas (17)", so the add box, Siri, the New dish sheet
("Add to “🍕 Pizza (6)”"), Rename's clash check and recipe → dish all find the real dish.
"🍕" ≠ "🎂" and "寿司" ≠ "ラーメン" still hold; an exact name still wins over a look-alike.

**Translations are judged when read.** The junk filter now accepts what the source already has:
the output starts with a letter, digit or "(", every character outside letters/space/' ’ . -
must also be in the source ("gelo (2 sacos)" → "ice (2 bags)" passes, "&", "▲", "<g…>" don't),
and multi-word names may grow to 5× their length and 3× their words ("pet food" → "alimentação
para animais de estimação"). The cache stores MyMemory's raw answer (`onConflictDoNothing`
again: first answer wins, a good row is never overwritten) and both `translateName` paths judge
the cached value on every read — a cached word never costs another lookup, and a later change
to the filter also applies to words looked up before it. `applyPrepared` only uses a row's saved
PT/EN names as merge aliases when `usableName` accepts them (the same rule as `itemNames`), so
saved junk can't cause a wrong merge and the browser's optimistic merge agrees with the server.

**Smaller ones.** Clear done locks the list's dish rows (in id order) before it deletes anything,
and the add path (`applyPrepared`) locks its dish row too: dish → items everywhere, so Clear done
can't deadlock with Remove dish, and a dish that just got an ingredient isn't cleared away
(reproduced with two sessions: old order → "deadlock detected" and an item left without its
dish; new order → both fine). The page's self-heal only creates dish rows for sections that
still have items at the moment of the insert (one insert … select), so a dish removed or renamed
between the page's two reads doesn't come back as an empty card. `createDish` retries with a
server id when the browser's id is already taken (was a TypeError → 500). Guest rows keep the
tick in `useOptimistic(item.checked)`, so a tick made by someone else shows after the refresh.

## Dishes — review fixes (2026-11-13, same day)

A QA + code review of the dishes branch on iPhone 15 Pro Max / SE (PT and EN, light and dark,
two accounts on one list). What changed, and why:

**Dishes are named by id, not by name** (the big one). Every button on a dish card now sends the
`list_dishes.id`; the server takes that row `FOR UPDATE`, reads its *current* name and works on
it — or answers `{ ok: false, error: "gone" }` (toast "This dish was removed · Create again")
instead of quietly re-creating a dish under an old name. Before, Sushi adding "açúcar" to "Bolo"
right after André renamed it "Bolo de chocolate" split the dish in two. Rename and add lock the
same row, so they run one after the other; remove takes the dish lock before the items (same
order as add → no deadlock). Only free text ("Lunch: cod" in the add box, Siri, recipe-as-dish)
still creates dishes by name. The browser mints the id of a new dish too (like item ids), so the
card it shows at once keeps its identity; cards, the collapse memory and the highlight are keyed
by id (a rename no longer re-opens a collapsed card or re-mounts it). Undo snapshots carry the
dish id of each item's section, so an Undo after a rename goes back under the new name.

**`applyItems` is one transaction** with the candidate rows locked (`FOR UPDATE`, in id order).
Two people adding "200 g bacon" at the same moment now get 400 g. Translations are looked up
*before* the transaction (the translator can take seconds; never hold locks over the network).

**Several removals, one Undo.** Removals made while the Undo toast is up join it ("Removed “alho”
and “cebola” · Undo all"; newest first, positions replayed in reverse). A second ⊖/swipe within
400 ms of a removal is ignored (the next row slides under the finger), a row on its way out takes
no taps, and the toast's button ignores taps in its first 450 ms (a double tap near the bottom
used to hit Undo). Toasts with an action stay ≥ 10 s and pause while touched or focused
(VoiceOver, WCAG 2.2.1); text wraps to two lines; opening a sheet dismisses a leftover toast.

**Ticks say what they want.** `toggleItem({ itemId, checked })` (also for guests): two people
ticking the same item both mean "bought" — a flip used to undo the other one's tick. A row that
is already gone answers `{ ok: false }` instead of throwing; every item action now goes through
`BoardProvider.run` (optimistic + toast on failure), and `(app)/error.tsx` is the safety net —
before, one failed tick replaced the whole list with Next's "This page couldn't load".

**Typed names stay as typed.** `translateName(name, lang)` keeps the typer's UI language as-is
and only looks up the other one (pairs → direction-specific cache `pt:<key>` → MyMemory). Machine
output that isn't word-like (`&Mudo`, `▲Olives`), is > 3× longer or has 3+ extra words ("caril" →
"Charles Starkweather") is refused; old junk already saved is skipped at display time
(`itemNames`), so no data migration was needed. Siri, guests and the backfill still guess the
language. Within a dish, "2 ovos" now merges into "eggs ×3" (the row's PT/EN names are aliases
in `planMerge`, on both client and server).

**Dish names**: `sameDish` no longer treats every emoji-only or non-Latin name as the same dish
("🍕" ≠ "🎂", "寿司" ≠ "ラーメン"); punctuation-only differences still are ("Dia 1" = "Dia 1!").

**UX**: By dish shows the dishes first and the items without a dish last, as one "No dish" card
with its own add row (was: aisle cards on top, so the view looked like By aisle). Dish names get
two lines with "N left" under them. A floating "＋ Dish" button sits in thumb reach in By dish
(hidden while a toast or a sheet is up). Add rows say where they add ("Add to Lasanha…"). The
view tip depends on the view and hides after 3 switches or ×. The main add box clears at once,
never disables while saving, shows plain items instantly (with the browser's ids) and queues the
rest. Recipes know when they're already a dish on the open list ("✓ On list" → opens it; adding
again is its own "Add again (×2)" button); the New dish sheet also offers the other list
members' recipes, grouped by owner. Aisle view on < 400 px: the dish tag is its emoji. Swipe
strip: the bin follows the row's edge, the word joins past ~92 px, the bin grows past the
threshold. `--on-brand` (dark green in dark mode, ~8:1) replaces white on the bright dark-mode
green (~2:1). Every control the review measured is ≥ 44 px (header, add box, chips, toggle).
No ×1 on plain counts. A shared list shows its owner ("My list · André", 👥), and on a device
with no list chosen yet a member whose own list is still empty opens the shared list.

## Dishes — edit, create, remove (2026-11-13)

Andre: "I need to be able to add or remove ingredients to dishes or create new dishes — make it
easy, intuitive and amazing UX". A *dish* is still a section of a list (`items.section`), so the
AddBar "Lunch: cod, potatoes" syntax, the Siri webhook, merge-within-a-dish and the aisle view's
dish tags keep working unchanged.

**What the user gets (iPhone, one hand)**
- **By dish** view: each dish is one card — emoji (shape, never colour alone) + name + "3 left",
  a ⋯ button and a collapse chevron. Ingredients are one flat list (to buy first, bought last;
  the aisle is still in the item menu and the aisle view), no aisle sub-cards inside a dish.
- **+ Add ingredient** row at the bottom of every card: type "200 g bacon, natas" + Return →
  parsed/categorised by the same pipeline, added to *that* dish (merging only within it), the
  field clears and keeps focus for the next one. The rows appear instantly (optimistic, muted
  until the server confirms) and slide in. Typing a recipe name here adds it as an ingredient —
  no recipe expansion inside a dish (predictable; "Start from a recipe" covers that).
- **Remove an ingredient**: a visible ⊖ button on every row in the dish view, and swipe-left on
  any row (both views; a full swipe removes, the revealed strip says "Remove" with a bin icon).
  The row slides out and an **Undo** toast stays ~6 s. The ⋯ menu's Delete uses the same path.
- **＋ New dish**: a compact "＋ Dish" button next to the By aisle | By dish toggle (both views,
  also shown when a list has no dishes yet) and a large dashed "＋ New dish" tile at the end of
  the dish view. It opens a bottom sheet: name (+ one-tap emoji row, auto-suggested from the
  name — "Lasanha" → 🍝), ingredients (one per line or comma separated, with a live preview of
  how each line is understood), and **Start from a recipe** (search your recipes; picking one
  fills the name if empty and the ingredients, which stay editable). Create → the sheet closes,
  the view switches to By dish, the new card appears at once (optimistic), opens, scrolls into
  view and gets a short highlight ring. A name that already exists turns the button into
  "Add to “X”" (adds the ingredients to it) — no duplicate dishes.
- **Dish ⋯ menu** (bottom sheet): Rename (name + emoji), Save as recipe (or "Update recipe" when
  you already have one with that name — creates/replaces it from the dish's ingredients; toast
  offers "Open"), Remove dish (removes the dish and its ingredients at once, Undo toast ~8 s; no
  confirm dialog because undo is faster and just as safe).
- **Recipes tab**: each recipe card's button is now **Add as dish** — it lands in the *active*
  list as a dish named after the recipe (adding it twice doubles the quantities inside that
  dish). The Recipes pages, the recipe editor and the list sheet are now PT/EN too.
- **Clear done** also clears dishes whose every ingredient was bought and cleared (a just-created
  empty dish stays), and now has an Undo toast too.

**Data: keep empty dishes → `list_dishes` table (migration 0004)**
- A dish must survive losing its last ingredient and must exist before it has any (create a dish
  by name, then add). Deriving dishes from items can't do either, so a tiny registry table:
  `list_dishes (id, list_id → lists ON DELETE CASCADE, name, emoji, created_at, updated_at)`,
  unique `(list_id, name)` (also the list_id index). Items still join by **name**
  (`items.section`) — no FK, so every existing write path keeps working. Order = `created_at`.
- `emoji`: null = auto-suggest from the name (pure `suggestEmoji`), "" = explicitly none, else
  one of a fixed 16-emoji palette (validated as an enum server-side).
- Invariant kept by one choke point: `applyItems` ensures a dish row for any section it writes
  (`insert … on conflict do nothing`), so AddBar sections, the webhook, recipe-as-dish and
  move-to-dish all register their dish. `ingestText` canonicalises "lunch:" onto an existing
  "Lunch" (accent/case/plural-insensitive) so near-duplicate dishes aren't created.
- The page still tolerates an item whose section has no row (shown as a dish; any action on it
  creates the row) — defence in depth, not an expected state.
- **Migration safety**: additive only — a new table plus a backfill of one row per distinct
  `(list_id, section)` already in `items` (`created_at = min(item.created_at)`, so dishes keep
  today's order). Nothing existing is altered or dropped; an older image simply ignores the table.

**Undo = signed snapshot, not soft delete**
- Removing returns an **undo token**: the deleted rows (items + any dish rows) as JSON, HMAC-SHA256
  signed with a key derived from `BETTER_AUTH_SECRET`, bound to the user and list, valid 10 min.
  Undo sends it back; the server verifies signature, expiry, user and *current* list access, then
  re-inserts the exact rows (same ids, created_at → same position, translations, checked state)
  with `on conflict do nothing`. Stateless, tamper-proof, survives restarts, and no query
  anywhere has to learn a `deleted_at` filter (soft delete would touch every read path).
- The toast appears immediately (it holds the pending delete promise), so Undo works even if
  tapped before the server answered.

**Optimistic UI**
- The list page now hands one flat model (items + dishes) to a client `BoardProvider` holding
  React 19 `useOptimistic` with a pure reducer (`applyOp`: add / remove / restore / createDish /
  renameDish / removeDish — unit-tested). Both views are pure derivations of that model, and
  the By aisle | By dish switch is client state (cookie still remembers it) → instant, no refresh.
- New rows keep their identity across the round trip: the client generates the item ids
  (`crypto.getRandomValues`, works on plain-http LAN too), runs the *same* parse + `planMerge`
  locally, and the server uses those ids for its inserts (regex-validated; `on conflict do
  nothing`, so a forged id can never touch another row). Result: no flicker when the pending row
  becomes real, and an optimistic quantity bump when an ingredient merges.
- Actions `revalidatePath("/")` so the response carries the fresh tree in the same transition;
  the optimistic layer drops exactly when real data lands (no extra `router.refresh()` round trip).
- Item check state moved to `useOptimistic` too (it used to be `useState(prop)`, which never
  re-synced when Sushi changed it on her phone).

**Server actions** (`src/lib/actions/dishes.ts`): addToDish, createDish, renameDish, removeDish,
saveDishAsRecipe, restoreRemoved; all zod-validated and gated by `getAccessibleList` (owner or
member). Queries are set-based (one select for the dish's items, one insert for the rows, one
delete … returning) — no per-item loops. Recipes stay per-user: "Save as recipe" saves to the
signed-in user's recipes, and the New dish sheet offers the signed-in user's recipes.

**Found while testing (fixed)**
- Rows inserted by one statement share `created_at`, so their order was arbitrary (a restored
  row could jump to the top). `applyItems` now writes `sort_order` = position in the batch and
  `getListItems` orders by `checked, created_at, sort_order, id`.
- A JS `Date` keeps milliseconds but Postgres stores microseconds, so a restored row sorted a
  hair earlier than its batch. Removals now `returning` `created_at::text` too, and Undo
  re-inserts that exact value (`::timestamptz`).
- Next 16 `next dev` blocks HMR from any host but the one it bound to, so the LAN test box
  (phone → `http://<ip>:3077`) never hydrated. `allowedDevOrigins` now reads the opt-in env
  `MRLIST_DEV_ORIGINS` (dev only; unset in production, no IP in the repo).
- On a 320 px phone in PT, "Por corredor | Por prato" squeezed "＋ Prato": segments now size to
  their words, and below 400 px the decorative 🛒/🍽️ drop and the labels go 13 px.

**Colour-blind + touch rules applied**: every state = icon + word + shape (⊖ remove, bin + "Remove"
strip, ✓ + word on "On list"), orange only as a secondary cue, no red-vs-green; every new control
≥ 44 px; motion respects reduced motion (MotionConfig `reducedMotion="user"`, scrolls become
instant).

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
