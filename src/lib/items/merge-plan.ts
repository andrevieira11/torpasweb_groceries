import { mergeQuantities } from "@/lib/quantity";

/** An item to add to a list, with its category already decided. */
export type IncomingItem = {
  name: string;
  normalizedName: string;
  qty: number | null;
  unit: string | null;
  categoryKey: string;
};

export type ExistingItem = {
  id: string;
  normalizedName: string;
  qty: number | null;
  unit: string | null;
};

export type MergePlan = {
  updates: { id: string; qty: number | null; unit: string | null }[];
  inserts: IncomingItem[];
};

/**
 * Decide, for a batch of incoming items, which existing rows to bump (compatible
 * units summed) and which to insert fresh. Used by both free-text add and recipe
 * expansion. Duplicates *within* the batch also merge. Pure — DB-free, testable.
 */
export function planMerge(
  incoming: IncomingItem[],
  existing: ExistingItem[],
): MergePlan {
  const byNorm = new Map<
    string,
    { id: string; qty: number | null; unit: string | null }
  >();
  for (const e of existing) {
    if (!byNorm.has(e.normalizedName)) {
      byNorm.set(e.normalizedName, { id: e.id, qty: e.qty, unit: e.unit });
    }
  }

  const updates: MergePlan["updates"] = [];
  const inserts: IncomingItem[] = [];

  for (const item of incoming) {
    const prev = byNorm.get(item.normalizedName);
    if (prev) {
      const merged = mergeQuantities(
        { qty: prev.qty, unit: prev.unit },
        { qty: item.qty, unit: item.unit },
      );
      if (merged) {
        if (prev.id.startsWith("insert:")) {
          const k = Number(prev.id.slice("insert:".length));
          inserts[k] = { ...inserts[k], qty: merged.qty, unit: merged.unit };
        } else {
          const existingUpdate = updates.find((u) => u.id === prev.id);
          if (existingUpdate) {
            existingUpdate.qty = merged.qty;
            existingUpdate.unit = merged.unit;
          } else {
            updates.push({ id: prev.id, qty: merged.qty, unit: merged.unit });
          }
        }
        prev.qty = merged.qty;
        prev.unit = merged.unit;
        continue;
      }
    }
    inserts.push(item);
    byNorm.set(item.normalizedName, {
      id: `insert:${inserts.length - 1}`,
      qty: item.qty,
      unit: item.unit,
    });
  }

  return { updates, inserts };
}
