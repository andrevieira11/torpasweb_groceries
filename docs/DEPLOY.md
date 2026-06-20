# Deploy

MrList ships as a single standalone image that **migrates on start**, then serves.
GitHub Actions builds and pushes the image to GHCR on every push to `main`;
Watchtower on the Proxmox host auto-pulls it. Caddy terminates TLS in front.

```
push main ─▶ GitHub Actions ─▶ ghcr.io/andrevieira11/torpasweb_groceries:latest
                                          │
                              Watchtower (polls every 5 min) ─▶ recreates `app`
   Caddy (TLS) ─▶ app:3000 ─▶ Postgres (named volume)
```

## 1. GitHub (one-time)

The build workflow (`.github/workflows/deploy.yml`) authenticates with the
automatic `GITHUB_TOKEN` — **no repo secrets are required for CI.** You only need:

1. **Actions enabled** for the repo (Settings → Actions → General → Allow).
2. After the first successful run, make the package pullable by the host. Either:
   - **Make it public** (simplest): GitHub → your profile → Packages →
     `torpasweb_groceries` → Package settings → Change visibility → Public. Then
     the host pulls with no auth; or
   - **Keep it private** and run `docker login ghcr.io` on the host with a PAT
     that has `read:packages` (and give Watchtower the same creds via a mounted
     `~/.docker/config.json`).

> If you later add a `NEXT_PUBLIC_*` value that must be baked into the client,
> pass it as a `--build-arg` in the workflow and `ARG`/`ENV` it in the Dockerfile
> (public values are inlined at **build** time, not runtime).

## 2. Host (Proxmox / Docker)

```bash
git clone https://github.com/andrevieira11/torpasweb_groceries.git
cd torpasweb_groceries
cp .env.example .env        # then edit — see secrets below
docker compose up -d        # pulls the image, starts db + app + watchtower
docker compose logs -f app  # watch migrate-on-start, then "Ready"
```

### Secrets to put in the host `.env`

Generate strong values:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET, INGEST_WEBHOOK_TOKEN
openssl rand -hex 24   # POSTGRES_PASSWORD
```

| Var | Notes |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_DB` | e.g. `mrlist` / `mrlist` |
| `POSTGRES_PASSWORD` | strong random; must match `DATABASE_URL` |
| `DATABASE_URL` | `postgres://mrlist:<pw>@db:5432/mrlist?sslmode=disable` (host **db** = the compose service) |
| `BETTER_AUTH_SECRET` | 32-byte hex |
| `BETTER_AUTH_URL` | `https://list.torpasweb.com` (canonical https origin) |
| `NEXT_PUBLIC_APP_URL` | `https://list.torpasweb.com` |
| `INGEST_WEBHOOK_TOKEN` | bearer secret for the Siri webhook (see `docs/SIRI.md`) |
| `APP_PORT` | host port Caddy proxies to (default `3000`) |

### Caddy

Put `ops/Caddyfile`'s block into your host Caddy config and reload. Caddy
fetches TLS automatically and forwards `X-Forwarded-*`, so Better Auth marks
cookies `Secure`. Point `reverse_proxy` at `localhost:${APP_PORT}`.

## 3. Updating

- **Code changes**: push to `main` → Actions builds `:latest` → Watchtower swaps
  the `app` container within ~5 min (it runs `migrate.mjs` on boot, applying any
  new migrations). Nothing to do on the host.
- **Compose changes** (new env var, new service, port change): Watchtower only
  swaps the image — edit the host `compose`/`.env` and run `docker compose up -d`.

## Gotchas

- **Never `docker compose down -v`** — `-v` deletes the `mrlist_pgdata` volume
  (your whole database). Use `down` (no `-v`) or just `up -d` to recreate.
- **Map every env var** in `compose` (the `environment:` block), not only in
  `.env` — an unmapped var simply won't reach the container.
- Keep the host `compose`/`.env` in sync with the repo; host-specific values
  (like `APP_PORT`) live only in `.env`.
- When you add an option to an enum/zod/UI set, update **every** gate (schema,
  zod, seed in `scripts/migrate.mjs`, and the UI).
- Migrations are append-only and run automatically on container start; generate
  them locally with `npm run db:generate` and commit the `drizzle/` output.
