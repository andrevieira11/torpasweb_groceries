"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { listMembers, lists } from "@/db/schema";
import { getSession } from "@/lib/session";
import { ACTIVE_LIST_COOKIE, getAccessibleList } from "@/lib/queries/lists";
import { cleanDisplayName } from "@/lib/parse";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  expiresInDays: z.number().int().positive().max(365).nullable().optional(),
});

export async function createList(input: z.infer<typeof createSchema>) {
  const { name, expiresInDays } = createSchema.parse(input);
  const user = await requireUser();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000)
    : null;

  const list = await db.transaction(async (tx) => {
    const [l] = await tx
      .insert(lists)
      .values({ name: cleanDisplayName(name), ownerId: user.id, expiresAt })
      .returning();
    await tx
      .insert(listMembers)
      .values({ listId: l.id, userId: user.id, role: "owner" })
      .onConflictDoNothing();
    return l;
  });

  (await cookies()).set(ACTIVE_LIST_COOKIE, list.id, COOKIE_OPTS);
  revalidatePath("/");
  return { id: list.id };
}

export async function setActiveList(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const list = await getAccessibleList(user.id, listId);
  if (!list) throw new Error("List not found");
  (await cookies()).set(ACTIVE_LIST_COOKIE, listId, COOKIE_OPTS);
  revalidatePath("/");
}

export async function deleteList(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const [list] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
  if (!list || list.ownerId !== user.id) throw new Error("Forbidden");
  if (list.isDefault) throw new Error("Your default list can't be deleted.");

  await db.delete(lists).where(eq(lists.id, listId)); // cascades items/members/tokens
  (await cookies()).delete(ACTIVE_LIST_COOKIE);
  revalidatePath("/");
}

export async function leaveList(input: { listId: string }) {
  const { listId } = z.object({ listId: z.string().min(1) }).parse(input);
  const user = await requireUser();
  const [list] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
  if (!list) throw new Error("List not found");
  if (list.ownerId === user.id) throw new Error("The owner can't leave; delete the list instead.");

  await db
    .delete(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, user.id)));
  (await cookies()).delete(ACTIVE_LIST_COOKIE);
  revalidatePath("/");
}
