import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { items, listDishes } from "@/db/schema";
import { normalizeName } from "@/lib/parse/normalize";
import { dictionaryAliases } from "@/lib/i18n/pairs";
import { usableName } from "@/lib/i18n/plausible";
import { planMerge, type IncomingItem } from "./merge-plan";
import { translateName, type Names } from "@/lib/i18n/translate";
import type { Lang } from "@/lib/i18n/strings";

/** A database handle or an open transaction — the writers below take either. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Incoming items with their EN/PT names already looked up. */
export type Prepared = { incoming: IncomingItem[]; names: Map<string, Names> };

/**
 * Look up translations BEFORE any transaction: the translator may take a few seconds and must
 * never hold row locks. With the typer's UI language, what they typed stays their language's name.
 */
export async function prepareItems(incoming: IncomingItem[], lang?: Lang): Promise<Prepared> {
  const unique = [...new Set(incoming.map((i) => i.name))];
  const names = new Map(await Promise.all(unique.map(async (n) => [n, await translateName(n, lang)] as const)));
  return { incoming, names };
}

/**
 * Add a batch of resolved items to a list, merging compatible quantities into existing
 * unchecked rows of the same section (see planMerge) — also when the existing row has the
 * same item under its other-language name ("2 ovos" into "eggs ×3"). Shared by free-text add,
 * dish rows and recipe expansion. `addedByUserId` is null for guest writes (M3). A section also
 * gets its `list_dishes` row here — the one place every sectioned write passes — so a dish never
 * exists only on its items. Incoming `id`s (the browser's optimistic ids) are kept.
 *
 * Runs in one transaction with the candidate rows locked, so two people adding "200 g bacon"
 * to the same dish at the same moment end up with 400 g, never 200 g.
 */
export async function applyItems(
  listId: string,
  incoming: IncomingItem[],
  addedByUserId: string | null,
  addedByName: string | null = null,
  section: string | null = null,
  lang?: Lang,
) {
  const prepared = await prepareItems(incoming, lang);
  return db.transaction((tx) => applyPrepared(tx, listId, prepared, addedByUserId, addedByName, section));
}

/** applyItems' write half, inside the caller's transaction (dish actions lock the dish first). */
export async function applyPrepared(
  tx: Tx,
  listId: string,
  { incoming, names }: Prepared,
  addedByUserId: string | null,
  addedByName: string | null,
  section: string | null,
) {
  if (section) {
    await ensureDish(tx, listId, section);
    // Hold the dish row (dish → items, the lock order of every dish action and Clear done), so
    // a "Clear done" running meanwhile waits and then sees these rows instead of removing the dish.
    await tx
      .select({ id: listDishes.id })
      .from(listDishes)
      .where(and(eq(listDishes.listId, listId), eq(listDishes.name, section)))
      .for("update");
  }
  if (incoming.length === 0) return { added: 0, merged: 0 };

  const existing = await tx
    .select({
      id: items.id,
      name: items.name,
      normalizedName: items.normalizedName,
      qty: items.qty,
      unit: items.unit,
      namePt: items.namePt,
      nameEn: items.nameEn,
    })
    .from(items)
    .where(
      and(
        eq(items.listId, listId),
        eq(items.checked, false),
        // merge only within the same section ("tomatoes" for lunch ≠ for the salad)
        section ? eq(items.section, section) : isNull(items.section),
      ),
    )
    .orderBy(asc(items.createdAt), asc(items.sortOrder), asc(items.id))
    .for("update");

  // A row's saved translations count as its other names only when the list would show them
  // (same rule as itemNames), so saved junk can't merge a new item into the wrong row and the
  // browser's optimistic merge (planAdd) agrees with this one.
  const plan = planMerge(
    incoming,
    existing.map((e) => ({
      ...e,
      aliases: [
        usableName(e.name, e.namePt) ? normalizeName(e.namePt) : null,
        usableName(e.name, e.nameEn) ? normalizeName(e.nameEn) : null,
        ...dictionaryAliases(e.normalizedName),
      ],
    })),
  );

  for (const u of plan.updates) {
    await tx
      .update(items)
      .set({ qty: u.qty, unit: u.unit, updatedAt: new Date() })
      .where(eq(items.id, u.id));
  }

  if (plan.inserts.length > 0) {
    await tx
      .insert(items)
      .values(
        plan.inserts.map((i, n) => {
          const t = names.get(i.name) ?? { en: i.name, pt: i.name };
          return {
            id: i.id,
            nameEn: t.en,
            namePt: t.pt,
            listId,
            name: i.name,
            normalizedName: i.normalizedName,
            qty: i.qty,
            unit: i.unit,
            categoryKey: i.categoryKey,
            section,
            // Rows of one batch share created_at; keep the order they were typed in.
            sortOrder: n,
            addedByUserId,
            addedByName,
          };
        }),
      )
      .onConflictDoNothing(); // a reused id can never overwrite another row
  }

  return { added: plan.inserts.length, merged: plan.updates.length };
}

/** Register a dish (section) on a list; a no-op when it already exists. */
export async function ensureDish(
  tx: Tx | typeof db,
  listId: string,
  name: string,
  emoji: string | null = null,
  id?: string,
) {
  await tx.insert(listDishes).values({ id, listId, name, emoji }).onConflictDoNothing();
}
