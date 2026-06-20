import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { listShareTokens, lists } from "@/db/schema";

/** Active (non-revoked) share tokens for a list, keyed by kind — owner view. */
export async function getActiveShareTokens(listId: string) {
  const rows = await db
    .select({ kind: listShareTokens.kind, token: listShareTokens.token })
    .from(listShareTokens)
    .where(and(eq(listShareTokens.listId, listId), isNull(listShareTokens.revokedAt)));
  const out: { guest?: string; member_invite?: string } = {};
  for (const r of rows) out[r.kind] = r.token;
  return out;
}

/**
 * Resolve a share token to its list, enforcing every gate: right kind, not
 * revoked, token not expired, list not archived/expired. Returns null on any
 * failure — callers must treat null as "no access". This is the single trusted
 * source of a guest/invite's target list (never a client-supplied list id).
 */
async function resolveToken(token: string, kind: "guest" | "member_invite") {
  if (!token) return null;

  const [row] = await db
    .select({
      tokenId: listShareTokens.id,
      revokedAt: listShareTokens.revokedAt,
      tokenExpiresAt: listShareTokens.expiresAt,
      list: lists,
    })
    .from(listShareTokens)
    .innerJoin(lists, eq(lists.id, listShareTokens.listId))
    .where(and(eq(listShareTokens.token, token), eq(listShareTokens.kind, kind)))
    .limit(1);

  if (!row || row.revokedAt) return null;

  const now = new Date();
  if (row.tokenExpiresAt && row.tokenExpiresAt <= now) return null;
  if (row.list.archivedAt) return null;
  if (row.list.expiresAt && row.list.expiresAt <= now) return null;

  return { tokenId: row.tokenId, list: row.list };
}

export const resolveGuestToken = (token: string) => resolveToken(token, "guest");
export const resolveInviteToken = (token: string) => resolveToken(token, "member_invite");
