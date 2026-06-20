import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted: emit a minimal standalone server (Docker) — see docs/DEPLOY.md.
  output: "standalone",
  // We sit behind Caddy; trust its forwarded headers for the request origin.
  // (Next 16 derives the canonical origin from X-Forwarded-* when proxied.)
};

export default nextConfig;
