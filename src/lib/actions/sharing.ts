"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { listMembers, listShareTokens, lists } from "@/db/schema";
import { getSession } from "@/lib/session";
import { ACTIVE_LIST_COOKIE } from "@/lib/queries/lists";
import { resolveInviteToken } from "@/lib/queries/sharing";
import { generateToken } from "@/lib/token";

type ShareKind = "guest" | "member_invite";

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

async function requireOwner(userId: string, listId: string) {
  const [list] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
  if (!list || list.ownerId !== userId) throw new Error("Forbidden");
  return list;
}

async function getOrCreateToken(listId: string, createdBy: string, kind: ShareKind) {
  const [existing] = await db
    .select()
    .from(listShareTokens)
    .where(
      and(
        eq(listShareTokens.listId, listId),
        eq(listShareTokens.kind, kind),
        isNull(listShareTokens.revokedAt),
      ),
    )
    .limit(1);
  if (existing) return existing.token;

  const token = generateToken();
  await db.insert(listShareTokens).values({ listId, token, kind, createdBy });
  return token;
}

export async function createInviteLink(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  await requireOwner(user.id, listId);
  return { token: await getOrCreateToken(listId, user.id, "member_invite") };
}

export async function createGuestLink(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  await requireOwner(user.id, listId);
  return { token: await getOrCreateToken(listId, user.id, "guest") };
}

export async function revokeShareLink(input: { listId: string; kind: ShareKind }) {
  const { listId, kind } = z
    .object({ listId: z.string().min(1), kind: z.enum(["guest", "member_invite"]) })
    .parse(input);
  const user = await requireUser();
  await requireOwner(user.id, listId);
  await db
    .update(listShareTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(listShareTokens.listId, listId),
        eq(listShareTokens.kind, kind),
        isNull(listShareTokens.revokedAt),
      ),
    );
  revalidatePath("/");
}

/** A logged-in user redeems a member-invite link → joins as a member. */
export async function joinList(input: { token: string }) {
  const { token } = z.object({ token: z.string().min(1) }).parse(input);
  const user = await requireUser();

  const resolved = await resolveInviteToken(token);
  if (!resolved) throw new Error("This invite is invalid or has expired.");

  await db
    .insert(listMembers)
    .values({ listId: resolved.list.id, userId: user.id, role: "member" })
    .onConflictDoNothing();

  (await cookies()).set(ACTIVE_LIST_COOKIE, resolved.list.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
  return { listId: resolved.list.id, name: resolved.list.name };
}
