import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted: emit a minimal standalone server (Docker) — see docs/DEPLOY.md.
  output: "standalone",
  // We sit behind Caddy; trust its forwarded headers for the request origin.
  // (Next 16 derives the canonical origin from X-Forwarded-* when proxied.)
  // `next dev` only: extra hosts allowed to load dev resources (HMR), e.g. a LAN test box
  // opened from a phone — MRLIST_DEV_ORIGINS=192.168.1.235. Unset in production.
  allowedDevOrigins: process.env.MRLIST_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
};

export default nextConfig;
