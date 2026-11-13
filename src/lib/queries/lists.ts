import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { items, listDishes, listMembers, lists, user } from "@/db/schema";

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

/**
 * Every live list the user can reach (owned or member of), default first. `ownerName` is set
 * for lists someone else owns, so two "My list"s can be told apart ("My list · André").
 */
export async function getUserLists(userId: string) {
  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      isDefault: lists.isDefault,
      ownerId: lists.ownerId,
      ownerName: user.name,
      expiresAt: lists.expiresAt,
      archivedAt: lists.archivedAt,
      role: listMembers.role,
    })
    .from(listMembers)
    .innerJoin(lists, eq(lists.id, listMembers.listId))
    .innerJoin(user, eq(user.id, lists.ownerId))
    .where(and(eq(listMembers.userId, userId), isNull(lists.archivedAt)))
    .orderBy(desc(lists.isDefault), asc(lists.createdAt));
  return rows
    .filter(isLive)
    .map((r) => ({ ...r, ownerName: r.ownerId === userId ? null : r.ownerName }));
}

/**
 * The active list from the cookie (if still accessible + live), else the default list — or,
 * on a device with no choice remembered yet, a list shared with the user when their own
 * default list is still empty (Sushi opening the app on a new phone lands on André's list).
 */
export async function getActiveList(userId: string) {
  const jar = await cookies();
  const wanted = jar.get(ACTIVE_LIST_COOKIE)?.value;
  if (wanted) {
    const list = await getAccessibleList(userId, wanted);
    if (list && isLive(list)) return list;
  }
  const own = await getOrCreateDefaultList(userId);
  if (wanted) return own; // they chose a list once; don't second-guess a vanished one
  const shared = await sharedListIfOwnIsEmpty(userId, own.id);
  return shared ?? own;
}

async function sharedListIfOwnIsEmpty(userId: string, ownId: string) {
  const [anyItem] = await db.select({ id: items.id }).from(items).where(eq(items.listId, ownId)).limit(1);
  if (anyItem) return null;
  const [anyDish] = await db
    .select({ id: listDishes.id })
    .from(listDishes)
    .where(eq(listDishes.listId, ownId))
    .limit(1);
  if (anyDish) return null;
  const rows = await db
    .select({ list: lists })
    .from(listMembers)
    .innerJoin(lists, eq(lists.id, listMembers.listId))
    .where(and(eq(listMembers.userId, userId), ne(lists.ownerId, userId), isNull(lists.archivedAt)))
    .orderBy(desc(listMembers.createdAt));
  return rows.map((r) => r.list).find(isLive) ?? null;
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

/** All items in a list, unchecked first, then by insertion order (stable within a batch). */
export async function getListItems(listId: string) {
  return db
    .select()
    .from(items)
    .where(eq(items.listId, listId))
    .orderBy(asc(items.checked), asc(items.createdAt), asc(items.sortOrder), asc(items.id));
}

/** The list's dishes (including empty ones), oldest first — the By-dish view's order. */
export async function getListDishes(listId: string) {
  return db
    .select({ id: listDishes.id, name: listDishes.name, emoji: listDishes.emoji })
    .from(listDishes)
    .where(eq(listDishes.listId, listId))
    .orderBy(asc(listDishes.createdAt), asc(listDishes.name));
}

/**
 * Self-heal: every section an item uses gets its list_dishes row (they are always written
 * together, but rows written by an older app version may lack one). Cheap no-op normally.
 * The page reads items and dishes in two queries, so a dish removed or renamed in between
 * looks "missing" here: rows are only made for sections that still have items at the moment
 * of the insert (one statement), so such a dish never comes back as an empty card.
 */
export async function ensureDishRows(listId: string, sections: (string | null)[], known: string[]) {
  const missing = [...new Set(sections.filter((s): s is string => !!s))].filter((s) => !known.includes(s));
  if (missing.length === 0) return false;
  await db.execute(sql`
    insert into ${listDishes} (id, list_id, name, created_at)
    select 'dish_' || replace(gen_random_uuid()::text, '-', ''), ${items.listId}, ${items.section}, min(${items.createdAt})
    from ${items}
    where ${and(eq(items.listId, listId), inArray(items.section, missing))}
    group by ${items.listId}, ${items.section}
    on conflict do nothing`);
  return true;
}

/** Everyone on a list (owner + members) — whose recipes the list can start from. */
export async function getListPeople(list: { id: string; ownerId: string }) {
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(
      or(
        eq(user.id, list.ownerId),
        inArray(user.id, db.select({ id: listMembers.userId }).from(listMembers).where(eq(listMembers.listId, list.id))),
      ),
    );
}

export type ListItem = Awaited<ReturnType<typeof getListItems>>[number];
export type UserList = Awaited<ReturnType<typeof getUserLists>>[number];
