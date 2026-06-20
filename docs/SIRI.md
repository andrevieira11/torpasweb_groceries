# Add to MrList by voice (Siri / HomePod)

A PWA can't register native Siri App Intents, so the realistic path is a **Siri
Shortcut** that POSTs your dictated text to MrList's token-gated webhook. You say
it, Siri sends it, MrList parses + categorizes it into your default list — works
from your iPhone lock screen and from a HomePod.

This is honest about the limitation: there's no zero-tap native Siri without a
native app. With the Shortcut it's "Hey Siri, Add to MrList" → speak → done.

## What you need

- MrList deployed (e.g. `https://list.torpasweb.com`).
- The `INGEST_WEBHOOK_TOKEN` value from your server `.env` (treat it like a
  password). Generate one with `openssl rand -hex 32`.

## The endpoint

```
POST https://list.torpasweb.com/api/ingest
Authorization: Bearer <INGEST_WEBHOOK_TOKEN>
Content-Type: application/json

{ "text": "milk, 2kg potatoes, bananas" }
```

It accepts JSON `{"text":"..."}` or a raw `text/plain` body. The same parser as
the app handles bilingual input ("leite", "2kg arroz"), quantities, and recipe
expansion — so `"add meatloaf"` drops in the recipe's ingredients. Items land in
the **default list**, attributed to "Siri".

Test it from a terminal first:

```bash
curl -X POST https://list.torpasweb.com/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"2kg arroz, cerveja, add meatloaf"}'
```

A success looks like `{"ok":true,"kind":"items","added":2,"merged":0}`.

## Build the Shortcut (iPhone)

1. Open **Shortcuts** → **+** → name it **Add to MrList**.
2. Add **Dictate Text** (Actions → search "Dictate"). This is what Siri/HomePod
   reads aloud-then-listens for. *(Prefer typing? use **Ask for Input** instead.)*
3. Add **Get Contents of URL** and configure it:
   - **URL**: `https://list.torpasweb.com/api/ingest`
   - Tap **Show More**.
   - **Method**: `POST`
   - **Headers**: add one → key `Authorization`, value `Bearer YOUR_TOKEN`
     (paste the token after `Bearer ` — keep the space).
   - **Request Body**: `JSON` → add field → key `text`, type **Text**, value =
     the **Dictated Text** variable from step 2.
4. *(Optional)* Add **Show Notification** with **Contents of URL** so you get a
   confirmation.
5. Done. The shortcut name **is** the Siri phrase.

## Use it

- iPhone: "Hey Siri, **Add to MrList**" → Siri asks what to add → "two kilos of
  rice and bananas" → it's on your list.
- HomePod: same phrase. (The HomePod runs the shortcut on your behalf.)
- You can also tap the shortcut, or add it to your Home Screen / Lock Screen.

## Notes & troubleshooting

- **Keep the token secret.** Anyone with it can add to your default list. To
  rotate: change `INGEST_WEBHOOK_TOKEN` in `.env`, redeploy, update the Shortcut.
- Response codes: `401` wrong/missing token · `429` too many requests (60/min) ·
  `413` body too long · `400` empty/invalid · `503` token not configured on the
  server.
- The webhook only ever writes to the default list — it can't read your account
  or touch other lists.
