import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { items, listMembers, lists } from "@/db/schema";

export const ACTIVE_LIST_COOKIE = "mrlist_active";

function isLive(list: { archivedAt: Date | null; expiresAt: Date | null }) {
  if (list.archivedAt) return false;
  if (list.expiresAt && list.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

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

/** Every live list the user can reach (owned or member of), default first. */
export async function getUserLists(userId: string) {
  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      isDefault: lists.isDefault,
      ownerId: lists.ownerId,
      expiresAt: lists.expiresAt,
      archivedAt: lists.archivedAt,
      role: listMembers.role,
    })
    .from(listMembers)
    .innerJoin(lists, eq(lists.id, listMembers.listId))
    .where(and(eq(listMembers.userId, userId), isNull(lists.archivedAt)))
    .orderBy(desc(lists.isDefault), asc(lists.createdAt));
  return rows.filter(isLive);
}

/** The active list from the cookie (if still accessible + live), else default. */
export async function getActiveList(userId: string) {
  const jar = await cookies();
  const wanted = jar.get(ACTIVE_LIST_COOKIE)?.value;
  if (wanted) {
    const list = await getAccessibleList(userId, wanted);
    if (list && isLive(list)) return list;
  }
  return getOrCreateDefaultList(userId);
}

/**
 * The list the Siri webhook adds to: the earliest-created default list (single
 * owner now). Returns null if no list exists yet.
 */
export async function getIngestTargetList() {
  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.isDefault, true), isNull(lists.archivedAt)))
    .orderBy(asc(lists.createdAt))
    .limit(1);
  return list ?? null;
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
export type UserList = Awaited<ReturnType<typeof getUserLists>>[number];
