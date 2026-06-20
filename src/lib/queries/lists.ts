import "server-only";
import { and, eq, isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { items, listMembers, lists } from "@/db/schema";

/** The user's default list, created (with an owner membership) on first need. */
export async function getOrCreateDefaultList(userId: string) {
  const [existing] = await db
    .select()
    .from(lists)
    .where(
      and(eq(lists.ownerId, userId), eq(lists.isDefault, true), isNull(lists.archivedAt)),
    )
    .limit(1);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    const [list] = await tx
      .insert(lists)
      .values({ name: "My list", ownerId: userId, isDefault: true })
      .returning();
    await tx
      .insert(listMembers)
      .values({ listId: list.id, userId, role: "owner" })
      .onConflictDoNothing();
    return list;
  });
}

/**
 * Tenant boundary: returns the list only if `userId` owns it or is a member.
 * Null otherwise — callers must treat null as "no access".
 */
export async function getAccessibleList(userId: string, listId: string) {
  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), isNull(lists.archivedAt)))
    .limit(1);
  if (!list) return null;
  if (list.ownerId === userId) return list;

  const [member] = await db
    .select()
    .from(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)))
    .limit(1);
  return member ? list : null;
}

/** All items in a list, unchecked first, then by insertion order. */
export async function getListItems(listId: string) {
  return db
    .select()
    .from(items)
    .where(eq(items.listId, listId))
    .orderBy(asc(items.checked), asc(items.createdAt));
}

export type ListItem = Awaited<ReturnType<typeof getListItems>>[number];
