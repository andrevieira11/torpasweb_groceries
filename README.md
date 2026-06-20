# MrList

A super-simple, shared **groceries list** PWA. Open it, type or *speak* an item, it lands in the
right category, you check it off while shopping. Add a whole recipe (“add meatloaf”) and the
ingredients drop in with quantities. Share a list with family, or spin up a throwaway “trip” list and
invite people who don’t even have an account.

Self-hosted (Docker behind Caddy) at **list.torpasweb.com**. Bilingual item recognition (PT + EN); UI
in English.

## Stack

Next.js 16 (App Router, Turbopack, standalone) · React 19 · TypeScript · Tailwind v4 (CSS-first
tokens) · Drizzle ORM + Postgres · Better Auth · zod · motion · lucide-react · next-themes.

## Develop

```bash
npm install
cp .env.example .env       # fill in values (secrets: openssl rand -hex 32)
npm run db:generate        # generate SQL migrations from the Drizzle schema
npm run db:migrate         # apply migrations + seed categories (needs a running Postgres)
npm run dev
```

Quality gates (must pass): `npm run lint` and `npm run build`.

## Layout

- `src/app/**` — routes (route group `(app)` is the authenticated shell).
- `src/components/**` — product-named UI blocks.
- `src/db/**` — Drizzle schema + client; `drizzle/` — generated migrations.
- `src/lib/**` — auth, server actions, the bilingual parser/categorizer (see `src/lib/parse`).
- `scripts/migrate.mjs` — migrate + seed on container start.
- `docs/` — `DEPLOY.md`, `SIRI.md`, `DECISIONS.md`.

See `CLAUDE.md` / `AGENTS.md` for the full spec and engineering rules.
