# This is NOT the Next.js you know

This project uses the latest Next.js + React, which have breaking changes vs your training data —
APIs, conventions, caching, and file structure may all differ. **Before writing any config, route
handler, server action, middleware, or migration: check the bundled docs in
`node_modules/next/dist/docs/` (and the library's own docs / Context7) and confirm the installed
version.** Request APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async. Heed
deprecation notices. Learn the current way first, then implement.
