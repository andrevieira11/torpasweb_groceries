import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

/** URL-safe random token (~192 bits) for share/invite links. */
export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Constant-time string compare (for the ingest webhook bearer secret). */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
