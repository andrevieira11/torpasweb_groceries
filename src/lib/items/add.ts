import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { planMerge, type IncomingItem } from "./merge-plan";

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
    .where(and(eq(items.listId, listId), eq(items.checked, false)));

  const plan = planMerge(incoming, existing);

  for (const u of plan.updates) {
    await db
      .update(items)
      .set({ qty: u.qty, unit: u.unit, updatedAt: new Date() })
      .where(eq(items.id, u.id));
  }

  if (plan.inserts.length > 0) {
    await db.insert(items).values(
      plan.inserts.map((i) => ({
        listId,
        name: i.name,
        normalizedName: i.normalizedName,
        qty: i.qty,
        unit: i.unit,
        categoryKey: i.categoryKey,
        addedByUserId,
        addedByName,
      })),
    );
  }

  return { added: plan.inserts.length, merged: plan.updates.length };
}
