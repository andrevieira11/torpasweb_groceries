import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Undo tokens: a snapshot of what a removal deleted, signed so the client can hand it back
 * without being able to forge or edit it. Stateless (no table, survives restarts) and bound to
 * the user and list it came from. Pure apart from node:crypto — the secret is passed in.
 */
export type UndoPayload<T> = {
  uid: string;
  listId: string;
  exp: number; // ms epoch
  data: T;
};

export const UNDO_TTL_MS = 10 * 60_000;

function b64(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function mac(secret: string, body: string): Buffer {
  return createHmac("sha256", `mrlist-undo:${secret}`).update(body).digest();
}

export function signUndo<T>(
  p: { uid: string; listId: string; data: T },
  secret: string,
  now = Date.now(),
): string {
  const body = b64(JSON.stringify({ ...p, exp: now + UNDO_TTL_MS }));
  return `${body}.${b64(mac(secret, body))}`;
}

/** The payload, or null when the token is malformed, forged, expired or someone else's. */
export function verifyUndo<T>(
  token: string,
  secret: string,
  expect: { uid: string },
  now = Date.now(),
): UndoPayload<T> | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "base64url");
  const good = mac(secret, body);
  if (sig.length !== good.length || !timingSafeEqual(sig, good)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UndoPayload<T>;
    if (typeof p.exp !== "number" || p.exp < now) return null;
    if (p.uid !== expect.uid || typeof p.listId !== "string") return null;
    return p;
  } catch {
    return null;
  }
}
