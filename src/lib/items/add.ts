import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { planMerge, type IncomingItem } from "./merge-plan";
import { translateName } from "@/lib/i18n/translate";

/**
 * Add a batch of resolved items to a list, merging compatible quantities into
 * existing unchecked rows (see planMerge). Shared by free-text add and recipe
 * expansion. `addedByUserId` is null for guest writes (M3).
 */
export async function applyItems(
  listId: string,
  incoming: IncomingItem[],
  addedByUserId: string | null,
  addedByName: string | null = null,
  section: string | null = null,
) {
  if (incoming.length === 0) return { added: 0, merged: 0 };

  const existing = await db
    .select({
      id: items.id,
      normalizedName: items.normalizedName,
      qty: items.qty,
      unit: items.unit,
    })
    .from(items)
    .where(
      and(
        eq(items.listId, listId),
        eq(items.checked, false),
        // merge only within the same section ("tomatoes" for lunch ≠ for the salad)
        section ? eq(items.section, section) : isNull(items.section),
      ),
    );

  const plan = planMerge(incoming, existing);

  for (const u of plan.updates) {
    await db
      .update(items)
      .set({ qty: u.qty, unit: u.unit, updatedAt: new Date() })
      .where(eq(items.id, u.id));
  }

  if (plan.inserts.length > 0) {
    const names = await Promise.all(plan.inserts.map((i) => translateName(i.name)));
    await db.insert(items).values(
      plan.inserts.map((i, n) => ({
        nameEn: names[n].en,
        namePt: names[n].pt,
        listId,
        name: i.name,
        normalizedName: i.normalizedName,
        qty: i.qty,
        unit: i.unit,
        categoryKey: i.categoryKey,
        section,
        addedByUserId,
        addedByName,
      })),
    );
  }

  return { added: plan.inserts.length, merged: plan.updates.length };
}
