# Add to MrList by voice (Siri / HomePod)

A PWA can't register native Siri App Intents, so the path is a **Siri Shortcut**
that POSTs your dictated text to MrList's token-gated webhook. You say it, Siri
sends it, MrList parses + categorizes it into your default list. Honest version:
no zero-tap native Siri without a native app — but this gets close.

## What you need

- MrList deployed (e.g. `https://mrlist.torpasweb.com`).
- The `INGEST_WEBHOOK_TOKEN` from your server `.env` (treat it like a password;
  `openssl rand -hex 32`).

## The endpoint

```
POST https://mrlist.torpasweb.com/api/ingest
Authorization: Bearer <INGEST_WEBHOOK_TOKEN>
Content-Type: application/json

{ "text": "milk and 2kg potatoes and bananas" }
```

It accepts JSON `{"text":"..."}` or `text/plain`, handles bilingual input,
quantities, and recipe expansion (`"add meatloaf"`). Items land in the **default
list**, attributed to "Siri". The response includes a `message` you can read
back, e.g. `{"ok":true,"message":"Added onions, milk and bananas", ...}`.

Test from a terminal first:

```bash
curl -X POST https://mrlist.torpasweb.com/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"2kg arroz and cerveja"}'
```

## Build the Shortcut (iPhone)

Give it spoken feedback so it's not silent, and so you hear what it heard:

1. **Shortcuts** → **+**. Name it something short you'll say easily — e.g.
   **Groceries** (the name *is* the Siri phrase, so keep it snappy).
2. Add **Speak Text** → type `What do you need?` *(this makes Siri ask out loud,
   so you know when to talk).*
3. Add **Dictate Text**. Tap it → **Stop Listening: After Pause** (the default).
4. Add **Get Contents of URL**:
   - URL → `https://mrlist.torpasweb.com/api/ingest`
   - **Show More** → Method **POST**
   - Headers → **+** → `Authorization` = `Bearer YOUR_TOKEN`
   - Request Body → **JSON** → **+** → `text` = the **Dictated Text** variable
5. Add **Get Dictionary Value** → Key `message`, from **Contents of URL**.
6. Add **Speak Text** → the **Dictionary Value** from step 5 *(reads back "Added
   onions, milk and bananas").*

## Use it

- "Hey Siri, **Groceries**" → Siri asks "What do you need?" → say your list →
  it reads back what it added.
- **Add several at once**: say **"and"** between items — Siri doesn't insert
  commas, so *"milk and eggs and onions"* becomes 3 items, but *"milk eggs
  onions"* becomes one. Quantities work inline: *"two kilos of potatoes and a
  litre of milk"*.
- HomePod: same phrase.

## Troubleshooting

- `401` wrong/missing token · `429` too many requests (60/min) · `413` too long ·
  `503` token not configured.
- **"Could not connect to the server" but the website loads** → almost always
  HTTP/3 / QUIC: the server advertises h3 but UDP/443 isn't reachable, so Siri's
  POST over QUIC dies while browsers fall back to TCP. Fix in `docs/DEPLOY.md`
  (disable HTTP/3 in Caddy, or forward UDP/443).
- Keep the token secret; rotate by changing `.env` + `docker compose up -d` and
  updating the Shortcut's Bearer.
