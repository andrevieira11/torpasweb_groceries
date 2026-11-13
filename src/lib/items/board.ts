import { CATEGORIES, FALLBACK_CATEGORY } from "@/lib/categories";
import { parseInput } from "@/lib/parse/parseInput";
import { categorize } from "@/lib/parse/categorize";
import { normalizeName } from "@/lib/parse/normalize";
import { dictionaryAliases } from "@/lib/i18n/pairs";
import { planMerge } from "./merge-plan";
import { sameDish } from "./sections";

/**
 * The list page's client model: every item (flat) plus the list's dishes. Both views are pure
 * derivations of it, and every optimistic change is a pure `applyOp` — so React's
 * useOptimistic can layer pending edits over the server's truth. No I/O; unit-tested.
 *
 * Items belong to a dish by name (items.section); dishes are identified by their list_dishes
 * id, so a rename keeps the same card (and the buttons on it keep pointing at the same dish).
 */
export type BoardItem = {
  id: string;
  name: string; // in the UI language
  alt: string | null; // the same item in the other language
  normalizedName: string;
  dish: string | null; // items.section
  qty: number | null;
  unit: string | null;
  categoryKey: string;
  checked: boolean;
  pending?: boolean; // shown optimistically, not saved yet
};
export type BoardDish = { id: string; name: string; emoji: string | null; pending?: boolean };
export type Board = { items: BoardItem[]; dishes: BoardDish[] };
export type QtyUpdate = { id: string; qty: number | null; unit: string | null };
/** One removed item to put back: where it was, and the id of the dish it was in (renames). */
export type RestoreItem = { item: BoardItem; at: number; dishId?: string };

export type BoardOp =
  | { kind: "add"; dish?: BoardDish; inserts: BoardItem[]; updates: QtyUpdate[] }
  | { kind: "remove"; ids: string[] }
  | { kind: "restore"; items: RestoreItem[]; dishes: { dish: BoardDish; at: number }[] }
  | { kind: "renameDish"; id: string; to: string; emoji: string | null }
  | { kind: "removeDish"; id: string }
  | { kind: "patch"; id: string; patch: Partial<Omit<BoardItem, "id">> };

/** Same cap as the server's add paths. */
export const MAX_ADD = 50;

export function applyOp(board: Board, op: BoardOp): Board {
  switch (op.kind) {
    case "add": {
      const dishes =
        op.dish && !board.dishes.some((d) => d.id === op.dish!.id || d.name === op.dish!.name)
          ? [...board.dishes, { ...op.dish, pending: true }]
          : board.dishes;
      const upd = new Map(op.updates.map((u) => [u.id, u]));
      const have = new Set(board.items.map((i) => i.id));
      const items = board.items.map((i) => {
        const u = upd.get(i.id);
        return u ? { ...i, qty: u.qty, unit: u.unit } : i;
      });
      for (const ins of op.inserts) if (!have.has(ins.id)) items.push({ ...ins, pending: true });
      return { items, dishes };
    }
    case "remove": {
      const gone = new Set(op.ids);
      return { ...board, items: board.items.filter((i) => !gone.has(i.id)) };
    }
    case "restore": {
      const dishes = [...board.dishes];
      for (const { dish, at } of [...op.dishes].sort((a, b) => a.at - b.at)) {
        if (!dishes.some((d) => d.id === dish.id || d.name === dish.name)) {
          dishes.splice(Math.min(Math.max(at, 0), dishes.length), 0, dish);
        }
      }
      const items = [...board.items];
      const have = new Set(items.map((i) => i.id));
      for (const { item, at, dishId } of [...op.items].sort((a, b) => a.at - b.at)) {
        if (have.has(item.id)) continue;
        // Back into its dish under the dish's current name (it may have been renamed since).
        const now = dishId ? dishes.find((d) => d.id === dishId)?.name : undefined;
        items.splice(Math.min(Math.max(at, 0), items.length), 0, now ? { ...item, dish: now } : item);
      }
      return { items, dishes };
    }
    case "renameDish": {
      const from = board.dishes.find((d) => d.id === op.id)?.name;
      if (from === undefined) return board;
      return {
        dishes: board.dishes.map((d) => (d.id === op.id ? { ...d, name: op.to, emoji: op.emoji } : d)),
        items: board.items.map((i) => (i.dish === from ? { ...i, dish: op.to } : i)),
      };
    }
    case "removeDish": {
      const name = board.dishes.find((d) => d.id === op.id)?.name;
      return {
        dishes: board.dishes.filter((d) => d.id !== op.id),
        items: name === undefined ? board.items : board.items.filter((i) => i.dish !== name),
      };
    }
    case "patch":
      return { ...board, items: board.items.map((i) => (i.id === op.id ? { ...i, ...op.patch } : i)) };
  }
}

/**
 * What adding `text` to `dish` (a name, or null = no dish) will do, computed exactly like the
 * server does it (same parser, same merge, merging only into unchecked items of that dish —
 * also into a row that has the item under its other-language name), with fresh ids for every
 * parsed line. The caller sends `ids` along so the server's new rows keep them.
 */
export function planAdd(
  board: Board,
  dish: string | null,
  text: string,
  makeId: () => string,
): { ids: string[]; inserts: BoardItem[]; updates: QtyUpdate[] } {
  const parsed = parseInput(text).slice(0, MAX_ADD);
  const ids = parsed.map(() => makeId());
  const existing = board.items
    .filter((i) => !i.checked && (i.dish ?? null) === dish)
    .map((i) => ({
      ...i,
      aliases: [normalizeName(i.name), i.alt && normalizeName(i.alt), ...dictionaryAliases(i.normalizedName)],
    }));
  const plan = planMerge(
    parsed.map((p, n) => ({
      id: ids[n],
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      categoryKey: categorize(p.name),
    })),
    existing,
  );
  return {
    ids,
    updates: plan.updates,
    inserts: plan.inserts.map((i) => ({
      id: i.id!,
      name: i.name,
      alt: null,
      normalizedName: i.normalizedName,
      dish,
      qty: i.qty,
      unit: i.unit,
      categoryKey: i.categoryKey,
      checked: false,
    })),
  };
}

/** To buy first, bought last; otherwise the order they came in. */
export function toBuyFirst<T extends { checked: boolean }>(items: T[]): T[] {
  return [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)];
}

/** Items by store aisle, in aisle order, empty aisles dropped. */
export function byAisle<T extends { categoryKey: string; checked: boolean }>(
  items: T[],
): { key: string; items: T[] }[] {
  const known = new Set(CATEGORIES.map((c) => c.key));
  return CATEGORIES.map((c) => ({
    key: c.key,
    items: toBuyFirst(
      items.filter((i) => (known.has(i.categoryKey) ? i.categoryKey : FALLBACK_CATEGORY) === c.key),
    ),
  })).filter((g) => g.items.length > 0);
}

export type DishGroup = BoardDish & { items: BoardItem[] };

/**
 * The By-dish view: every dish in order (empty ones included), plus the items without a dish
 * (shown last, as one card). An item whose dish has no row (only for a moment, e.g. right
 * after an Undo) still gets a card — marked pending, since there is no dish row to act on yet.
 */
export function dishView(board: Board): { loose: BoardItem[]; dishes: DishGroup[] } {
  const loose: BoardItem[] = [];
  const byDish = new Map<string, BoardItem[]>();
  for (const i of board.items) {
    if (!i.dish) loose.push(i);
    else byDish.set(i.dish, [...(byDish.get(i.dish) ?? []), i]);
  }
  const dishes: DishGroup[] = board.dishes.map((d) => ({ ...d, items: toBuyFirst(byDish.get(d.name) ?? []) }));
  for (const [name, items] of byDish) {
    if (!board.dishes.some((d) => d.name === name)) {
      dishes.push({ id: `orphan:${name}`, name, emoji: null, pending: true, items: toBuyFirst(items) });
    }
  }
  return { loose: toBuyFirst(loose), dishes };
}

/** The dish a name refers to (exact first, then case/accent/plural-insensitive). */
export function findDish<T extends { name: string }>(dishes: T[], name: string): T | undefined {
  return dishes.find((d) => d.name === name) ?? dishes.find((d) => sameDish(d.name, name));
}
