@AGENTS.md

# MrList — shared groceries list (Claude Code project config)

MrList is a **super-simple, shared groceries list** PWA: open it, type or *speak* an item, it lands
in the right category, you check it off while shopping. Add a whole recipe ("add meatloaf") and it
drops the ingredients in with quantities. Share a list with family, or spin up a throwaway "trip"
list and invite people who don't even have an account. Self-hosted on the owner's Proxmox (Docker
behind Caddy) at **list.torpasweb.com**. Single user now, architected for shared lists from day one.

> **These instructions OVERRIDE default behavior. Follow them exactly.**
> Repo: `github.com/andrevieira11/torpasweb_groceries` · Image: `ghcr.io/andrevieira11/torpasweb_groceries`

## Deployment rule (do not violate)
- NEVER build this app on the server / Proxmox VM 100 — builds freeze the whole VM.
- Images are built and pushed from the PC (or CI), tagged :latest and the git SHA.
- The server compose uses `image:` only — it must never contain a `build:` section for this app.
- Deploying on the server means exactly: docker compose pull && docker compose up -d. Nothing else.
- If I say "deploy" / "ship" / "push it", run the PC build+push then the remote pull — do not add a server-side build.
- Ship `deploy.sh`/`deploy.ps1` (build + tag :latest and git short-SHA + push to GHCR) and
  `release.sh`/`release.ps1` (deploy then remote `docker compose pull && up -d` over SSH).

---

## 0. Prime directive — LEARN BEFORE EACH STEP

Never write version-sensitive code from memory. Your training data lags; frameworks ship breaking
changes. Assume the installed version is NOT the one you remember.

**Per-step loop — do this for every step:**
1. **State** the step + which libraries/APIs it touches.
2. **Learn the current way first**: read bundled docs (`node_modules/<lib>/dist/docs/…`, README, `.d.ts`),
   and/or fetch live docs via **Context7**, and check the installed version + deprecations.
3. **Implement** in the house style (match naming, idiom, comment density of surrounding code).
4. **Verify**: `npm run lint` + `npm run build` must pass. Pure-logic test for correctness-critical bits.
5. **Record** what was non-obvious in `docs/DECISIONS.md`.

> If you're typing an API signature you haven't looked up this session — stop and look it up.
> **This is NOT the Next.js you remember** (see `AGENTS.md`); request APIs (`cookies()`, `headers()`,
> `params`, `searchParams`) are async; verify caching/config against current docs.

---

## 1. Tech stack (pin latest at scaffold, then re-learn each API)

Next.js (latest, App Router, Turbopack, `output:'standalone'`) · React · TypeScript · **Tailwind v4**
(CSS-first `@theme` tokens, class-based dark via `@custom-variant`) · **motion** (Framer) ·
**Drizzle ORM** + Postgres (postgres-js) · **Better Auth** · **zod** at every boundary · `cuid2` ·
`date-fns` · `lucide-react` · `next-themes`. **npm only.** Deploy: `node:<lts>-alpine` standalone +
Postgres + Caddy. Keep it lean — this app is intentionally simple; don't over-build.

---

## 2. Scope — what MrList must do

**Core (keep it dead simple):**
- A **List** of **Items**, auto-grouped into **Categories** (Produce, Dairy, Meat & Fish, Bakery,
  Frozen, Pantry, Drinks, Household, Other…). Tap to check off; checked items sink/grey out.
- **Fast add**: one box. Type "milk, 2kg potatoes, bananas" → 3 items, parsed + categorized. Works by
  voice too (see Siri). Quantity + unit optional (`2kg`, `x3`, `2 L`).
- **Auto-categorize** via a bilingual keyword dictionary; **manual override** (move item's category);
  **learn** manual fixes so the same item auto-sorts next time (like a merchant-memory rule).
- **Bilingual (PT + EN)**: the parser + categorizer must understand both ("leite"→Dairy, "milk"→Dairy;
  "adiciona"/"add"). UI copy is **English**; item recognition is bilingual. Accent-fold for matching.

**Recipes tab:**
- A **Recipe** = name + ingredients, each `{name, qty, unit, category}`. CRUD in a Recipes tab.
- "**Add meatloaf**" (typed or spoken) → fuzzy-match the recipe → add all its ingredients to the active
  list, **merging quantities** with any existing same item (compatible units sum; otherwise separate line).

**Siri / HomePod (iPhone integration):**
- A PWA can't expose native App Intents, so the path is a **Siri Shortcut → token-gated webhook**.
  `POST /api/ingest` (bearer token, constant-time compare, rate limit, body cap) accepts free text
  (PT/EN). The same parser handles "bananas", "2kg arroz", or "add meatloaf" (recipe expansion).
- On HomePod: "Hey Siri, *Add to MrList*" → the Shortcut dictates/asks the text → POSTs. Document the
  exact Shortcut in `docs/SIRI.md` (like a moey!-style guide). Adds to the user's **default list**
  (configurable). Be honest in docs: zero-tap native Siri needs a native app; this is the realistic path.

**Sharing & temporary lists:**
- A List can have **members** (accounts) via an invite link → they join and add/check.
- **Guest access (no account):** a List carries a **public share token**; anyone with the link can
  view + add/check items without signing up (set an optional display name). For trips/events.
- Lists can be **temporary**: optional `expiresAt`; auto-archive after. A normal list has no expiry.
- Security: a guest token grants **only that one list** (add/view/check) — never account data or other
  lists. Rate-limit + size-cap guest writes and the webhook.

**Design:** clean, minimal, *cool*, mobile-first PWA — see §3. Simple and obvious beats clever.

---

## 3. Aesthetic & feel (make it feel premium-simple)

- **Design tokens, not raw colors**: `--bg --surface --surface-2 --fg --muted --brand --hairline` +
  semantic `--good --over`; light + dark; dark via a `@custom-variant dark` class (next-themes).
- **Mobile-first, device-correct**: inputs **≥16px** (avoid iOS zoom); honor safe areas
  (`viewport-fit=cover`, `env(safe-area-inset-*)`); the add box and primary actions must clear the tab
  bar; buttons get `cursor:pointer`.
- **Motion budget**: subtle + purposeful (item check-off spring, add slide-in, category collapse).
  Always respect `prefers-reduced-motion`.
- **Restraint = taste**: one accent (`--brand`), ≤5 category colors reused, generous whitespace,
  rounded-2xl/3xl cards, hairline borders. Product-named components (`AddBar`, `ItemRow`,
  `CategoryGroup`, `RecipePicker`, `ShareSheet`). **Anti-AI-slop**: no generic purple gradients, no
  emoji soup, no stock hero.

---

## 4. Domain invariants (MUST hold)

1. **Tenant = List.** Every read/write is scoped by `list_id` AND access (an account member OR a valid
   guest share token). NEVER cross a list boundary.
2. **Guest tokens are least-privilege**: that one list, add/view/check only. Token gated, rate-limited,
   body-size-capped — same discipline as the `/api/ingest` webhook (bearer + constant-time compare).
3. **Quantities**: store `{qty:number, unit}`; merging the same normalized item sums compatible units,
   else keeps separate lines. Never silently lose a quantity.
4. **Item identity** for merge/categorize/learn = **normalized name** (lowercased, accent-folded,
   singular-ish), bilingual-aware.
5. **i18n**: UI English; parser + category dictionary accept **PT + EN**; accent-fold before matching.
6. **Locale**: pt-PT/EU sensible defaults; dates as calendar `DATE` (no tz drift).

---

## 5. Architecture & file organization

- `src/app/**` thin route pages; parallel/intercepting routes for add/edit/share modals.
- `src/components/**` product-named blocks; `src/components/ui/**` primitives.
- `src/lib/**` utils; `src/lib/actions/**` zod-validated server actions; `src/lib/queries/**` typed
  reads; `src/lib/auth.ts`. `src/lib/parse/**` the **bilingual item parser + categorizer**;
  `src/lib/recipes/**` recipe match + quantity-merge.
- `src/db/**` Drizzle schema + client + seed (category dictionary seed). `drizzle/` migrations.
- `src/app/api/ingest/**` the Siri webhook. `docs/` (DEPLOY, SIRI, DECISIONS). `ops/` scripts.
- Entities: `lists`, `list_members`, `list_share_tokens` (guest), `items`, `categories`,
  `recipes`, `recipe_ingredients`, `categorize_rules` (learned). Keep files < ~400 lines; logic in
  actions/lib, not pages.

## 6. Milestones (suggested — confirm/cut via the Council before building)

- **M0** Scaffold + design system/tokens + DB schema + Better Auth + app shell (tab bar / sidebar).
- **M1** List view + fast add + bilingual parse + auto-categorize + manual move + check-off + learned rules.
- **M2** Recipes tab (CRUD) + "add <recipe>" expansion with quantity-merge.
- **M3** Sharing: member invite link + **guest share token (no account)** + temporary lists (expiry).
- **M4** Siri `/api/ingest` webhook + parser reuse + `docs/SIRI.md` (HomePod Shortcut).
- **M5** PWA polish + deploy (Docker standalone, migrate-on-start, GHCR + Watchtower, Caddy).

---

## 7. Engineering Council (before non-trivial work)

Build ONE shared context packet (proposal + real `file:line` excerpts + facts); review through lenses —
data/queries+integrity, performance/CWV, security (the public webhook + **guest tokens** + tenant
isolation + zod), UX/taste, and a scope-cutting devil's advocate (guard the "super simple" goal). Default
a single multi-lens reviewer; escalate to parallel specialists for high-blast-radius changes (auth,
the ingest webhook + parser, guest-access model, migrations, deploy). Present a
`| Member | Verdict | Concern |` matrix before coding. One **BLOCK** = stop, revise, re-review.

## 8. Workflow & deploy

- Verify framework/library APIs before writing. Run `lint` + `build` before any milestone is "done".
- **Tests** (pure-logic, encouraged) for the correctness-critical trio: the **bilingual parser**, the
  **categorizer**, and **recipe expansion / quantity-merge**. No component/E2E suites unless asked.
- Commit/push only when asked; branch off main first unless told otherwise. **Never commit `.env`** —
  only `.env.example`. Secrets from env; generate as hex (`openssl rand -hex 32`).
- **Deploy**: Dockerfile `node:<lts>-alpine` standalone, `CMD sh -c "node scripts/migrate.mjs && node server.js"`
  (self-migrate on start). docker-compose: `db` + `app` (`pull_policy: always`, healthcheck) +
  **Watchtower** (`--label-enable --cleanup --interval 300`). GitHub Actions → `ghcr.io/andrevieira11/torpasweb_groceries:latest`
  on push → Watchtower auto-pulls. Caddy reverse proxy (`X-Forwarded-*`, secure cookies, TLS) →
  list.torpasweb.com. **Gotchas:** never `docker compose down -v` (wipes the DB); map every env var in
  compose (not just `.env`); Watchtower only swaps the image — structural compose changes need a manual
  `up -d`; keep host compose == repo with host-specifics (e.g. `APP_PORT`) in `.env`; when you add an
  option to an enum/zod/UI set, update **every** gate.
