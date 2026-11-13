"use client";

import { createContext, useContext, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyOp,
  findDish,
  planAdd,
  type Board,
  type BoardDish,
  type BoardItem,
  type BoardOp,
} from "@/lib/items/board";
import { cleanSection, splitSections } from "@/lib/items/sections";
import { normalizeName } from "@/lib/parse/normalize";
import { parseInput, stripCommandPrefix } from "@/lib/parse/parseInput";
import { matchRecipe } from "@/lib/recipes/match";
import { newId } from "@/lib/ids";
import { dishKey, setCollapsed } from "@/lib/collapsed";
import {
  addItems,
  clearChecked,
  deleteItem,
  editItem as editItemAction,
  moveItem as moveItemAction,
  setItemDish as setItemDishAction,
  toggleItem as toggleItemAction,
} from "@/lib/actions/items";
import {
  addToDish as addToDishAction,
  createDish as createDishAction,
  removeDish as removeDishAction,
  renameDish as renameDishAction,
  restoreRemoved,
  saveDishAsRecipe,
} from "@/lib/actions/dishes";
import { fill, removalMessage, TIPS_COOKIE, VIEW_COOKIE, type View } from "@/lib/i18n/strings";
import { useToast } from "../Toast";
import { useLang, useT } from "../LangProvider";

/** A recipe the New dish sheet can start from; `mine` = the signed-in user's (others are read-only). */
export type RecipeLite = { id: string; name: string; lines: string[]; ownerId: string; ownerName: string; mine: boolean };
type Restore = Extract<BoardOp, { kind: "restore" }>;
/** One removal the Undo toast can put back. `token` resolves to the server's undo token (or none). */
type UndoEntry = { full: string; short: string; restore: Restore; token: Promise<unknown> };

type BoardApi = {
  listId: string;
  board: Board;
  recipes: RecipeLite[];
  view: View;
  setView: (v: View) => void;
  /** Show the one-line view tips (until hidden, or after a few view switches). */
  tips: boolean;
  hideTips: () => void;
  /** The dish (id) just created/added to — its card gets a short highlight ring. */
  glow: string | null;
  addText: (text: string) => void;
  addToDish: (dishId: string | null, text: string) => void;
  createDish: (d: { name: string; emoji: string | null; text: string }) => void;
  /** False when ignored (a second tap right after a removal). */
  removeItem: (item: BoardItem) => boolean;
  removeDish: (id: string) => void;
  renameDish: (id: string, to: string, emoji: string | null) => void;
  saveAsRecipe: (id: string) => void;
  clearDone: () => void;
  toggleItem: (item: BoardItem, checked: boolean) => void;
  moveItem: (item: BoardItem, categoryKey: string) => void;
  editItem: (item: BoardItem, text: string) => void;
  setItemDish: (item: BoardItem, dishId: string | null) => void;
};

const BoardContext = createContext<BoardApi | null>(null);

export function useBoard(): BoardApi {
  const v = useContext(BoardContext);
  if (!v) throw new Error("useBoard needs a BoardProvider");
  return v;
}

// DOM ids by dish id (stable across renames). Orphan ids carry a name, hence the encoding.
export const dishDomId = (id: string) => `dish-${encodeURIComponent(id)}`;
export const addInputId = (id: string | null) => (id ? `dish-add-${encodeURIComponent(id)}` : "loose-add");
export const LOOSE_DOM_ID = "dish-loose";
/** A card shown for items whose dish row isn't there (yet) — nothing on the server to act on. */
export const isOrphan = (d: { id: string }) => d.id.startsWith("orphan:");

/** A second ⊖ tap / swipe this soon after a removal is ignored (the next row slid under it). */
const REMOVE_GUARD_MS = 400;
const SWITCHES_KEY = "mrlist:view-switches";

function rememberView(v: View) {
  document.cookie = `${VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Drop the optimistic "pending" flag (what Undo puts back is a saved row). */
function settled(item: BoardItem): BoardItem {
  const copy = { ...item };
  delete copy.pending;
  return copy;
}
function settledDish(dish: BoardDish): BoardDish {
  const copy = { ...dish };
  delete copy.pending;
  return copy;
}

/** The undo token in a removal action's answer; none when nothing was removed (already gone). */
function undoToken(r: unknown): string | null {
  return r && typeof r === "object" && "undo" in r && typeof r.undo === "string" ? r.undo : null;
}

/**
 * The open list as one optimistic model. Every edit applies a pure BoardOp at once (useOptimistic)
 * and runs its server action in the same transition; the action revalidates "/", so the real
 * data replaces the optimistic layer in one go — or, on failure, the layer simply falls away and
 * a toast says so (never an error page: no signal in the supermarket is normal).
 */
export function BoardProvider({
  listId,
  listOwnerId,
  board: server,
  recipes,
  initialView,
  initialTips,
  children,
}: {
  listId: string;
  listOwnerId: string;
  board: Board;
  recipes: RecipeLite[];
  initialView: View;
  initialTips: boolean;
  children: React.ReactNode;
}) {
  const tr = useT();
  const lang = useLang();
  const toast = useToast();
  const router = useRouter();
  const [board, apply] = useOptimistic(server, applyOp);
  const [, start] = useTransition();
  const [view, setViewState] = useState<View>(initialView);
  const [tips, setTips] = useState(initialTips);
  const [glow, setGlow] = useState<string | null>(null);
  const undoBatch = useRef<UndoEntry[]>([]);
  const lastRemoval = useRef(0);

  const failed = () => toast({ message: tr("couldNotSave") });
  const itemGone = (r: { ok: boolean }) => {
    if (!r.ok) toast({ message: tr("itemGone") });
  };

  function hideTips() {
    setTips(false);
    document.cookie = `${TIPS_COOKIE}=off; path=/; max-age=31536000; samesite=lax`;
  }

  function setView(v: View) {
    if (v !== view && tips) {
      try {
        const n = Number(localStorage.getItem(SWITCHES_KEY) ?? 0) + 1;
        localStorage.setItem(SWITCHES_KEY, String(n));
        if (n >= 3) hideTips(); // they know their way around by now
      } catch {}
    }
    setViewState(v);
    rememberView(v);
  }

  /** Apply ops optimistically and run the action; returns its promise (for Undo tokens). */
  function run<T>(ops: BoardOp[], action: () => Promise<T>, after?: (r: T) => void): Promise<T> {
    let p!: Promise<T>;
    start(async () => {
      for (const op of ops) apply(op);
      p = action();
      try {
        after?.(await p);
      } catch {
        failed();
      }
    });
    return p; // startTransition runs the scope synchronously, so p is set
  }

  /**
   * Offer Undo for a removal. Removals made while the toast is still up join it — "Removed
   * “alho” and “cebola” · Undo all" — so a quick second removal never loses the first one.
   */
  function offerUndo(entry: UndoEntry) {
    const entries = [...undoBatch.current, entry];
    undoBatch.current = entries;
    toast({
      key: "undo",
      message: removalMessage(lang, entries),
      action: { label: tr(entries.length > 1 ? "undoAll" : "undo"), icon: "undo", run: () => undoAll(entries) },
      onClose: () => {
        if (undoBatch.current === entries) undoBatch.current = [];
      },
    });
  }

  function undoAll(entries: UndoEntry[]) {
    const newestFirst = [...entries].reverse(); // positions were taken one after the other
    start(async () => {
      for (const e of newestFirst) apply(e.restore);
      let expired = false;
      for (const e of newestFirst) {
        let token: string | null = null;
        try {
          token = undoToken(await e.token);
        } catch {
          continue; // that removal never reached the server — nothing to put back
        }
        if (!token) continue;
        try {
          const { ok } = await restoreRemoved({ token });
          if (!ok) expired = true;
        } catch {
          failed();
          return;
        }
      }
      if (expired) toast({ message: tr("undoExpired") });
    });
  }

  /**
   * Someone else removed the dish this add was for: say so, and offer to create it again with
   * what was typed. The toast outlives this render, so it must not read `board` (stale by then):
   * the new dish is planned from scratch and the server files it (under a dish of that name if
   * one has appeared meanwhile).
   */
  function dishGone(dish: BoardDish, text: string) {
    toast({
      message: tr("dishGone"),
      action: text.trim() ? { label: tr("recreate"), icon: "add", run: () => recreateDish(dish, text) } : undefined,
    });
  }

  function recreateDish(dish: BoardDish, text: string) {
    const id = newId();
    const plan = planAdd({ items: [], dishes: [] }, dish.name, text, newId);
    run(
      [{ kind: "add", dish: { id, name: dish.name, emoji: dish.emoji }, inserts: plan.inserts, updates: [] }],
      () => createDishAction({ listId, id, name: dish.name, emoji: dish.emoji, text, ids: plan.ids }),
    );
    setGlow(id);
    setTimeout(() => setGlow((g) => (g === id ? null : g)), 2000);
  }

  /** The add box at the top. Plain items show at once; "Lunch: …" and recipe names after saving. */
  function addText(text: string) {
    const chunks = splitSections(text);
    const phrase = stripCommandPrefix(text.trim());
    const recipe =
      !!phrase &&
      !/[,\n;]/.test(phrase) &&
      !!matchRecipe(
        phrase,
        recipes.filter((r) => r.ownerId === listOwnerId).map((r) => ({ ...r, normalizedName: normalizeName(r.name) })),
      );
    if (chunks.length === 1 && !chunks[0].section && !recipe) {
      const plan = planAdd(board, null, text, newId);
      if (plan.ids.length === 0) return;
      run([{ kind: "add", inserts: plan.inserts, updates: plan.updates }], () =>
        addItems({ listId, text, ids: plan.ids }),
      );
    } else {
      run([], () => addItems({ listId, text }));
    }
  }

  function addToDish(dishId: string | null, text: string) {
    const dish = dishId ? board.dishes.find((d) => d.id === dishId) : null;
    if (dishId && !dish) return;
    const plan = planAdd(board, dish?.name ?? null, text, newId);
    if (plan.ids.length === 0) return;
    run(
      [{ kind: "add", inserts: plan.inserts, updates: plan.updates }],
      () => addToDishAction({ listId, dishId, text, ids: plan.ids }),
      (r) => {
        if (!r.ok && dish) dishGone(dish, text);
      },
    );
  }

  function createDish({ name, emoji, text }: { name: string; emoji: string | null; text: string }) {
    const clean = cleanSection(name);
    if (!clean) return;
    const existing = findDish(board.dishes, clean);
    const id = existing?.id ?? newId();
    const target = existing?.name ?? clean;
    const plan = planAdd(board, target, text, newId);
    if (existing) {
      if (plan.ids.length > 0) addToDish(existing.id, text);
    } else {
      run(
        [{ kind: "add", dish: { id, name: target, emoji }, inserts: plan.inserts, updates: plan.updates }],
        () => createDishAction({ listId, id, name: target, emoji, text, ids: plan.ids }),
      );
    }
    setCollapsed(dishKey(listId, id), false);
    setView("dish");
    setGlow(id);
    // After the sheet (and keyboard) slid away: bring the card into view.
    setTimeout(() => {
      document
        .getElementById(dishDomId(id))
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      if (plan.ids.length === 0) document.getElementById(addInputId(id))?.focus({ preventScroll: true });
    }, 360);
    setTimeout(() => setGlow((g) => (g === id ? null : g)), 2000);
  }

  function removeItem(item: BoardItem): boolean {
    const now = performance.now();
    if (now - lastRemoval.current < REMOVE_GUARD_MS) return false;
    lastRemoval.current = now;
    const at = board.items.findIndex((i) => i.id === item.id);
    if (at < 0) return false;
    const dishId = item.dish ? board.dishes.find((d) => d.name === item.dish)?.id : undefined;
    const token = run([{ kind: "remove", ids: [item.id] }], () => deleteItem({ itemId: item.id }));
    offerUndo({
      full: fill(tr("removedItem"), { name: item.name }),
      short: `“${item.name}”`,
      restore: { kind: "restore", items: [{ item: settled(item), at, dishId }], dishes: [] },
      token,
    });
    return true;
  }

  function removeDish(id: string) {
    const at = board.dishes.findIndex((d) => d.id === id);
    if (at < 0) return;
    const dish = board.dishes[at];
    const items = board.items
      .map((item, i) => ({ item: settled(item), at: i, dishId: id }))
      .filter((x) => x.item.dish === dish.name);
    const token = run(
      [{ kind: "removeDish", id }],
      () => removeDishAction({ listId, dishId: id }),
      (r) => {
        if (!r.ok) toast({ message: tr("dishGone") });
      },
    );
    offerUndo({
      full: fill(tr("removedDish"), { name: dish.name }),
      short: `“${dish.name}”`,
      restore: { kind: "restore", items, dishes: [{ dish: settledDish(dish), at }] },
      token,
    });
  }

  function renameDish(id: string, to: string, emoji: string | null) {
    const clean = cleanSection(to);
    if (!clean) return;
    run([{ kind: "renameDish", id, to: clean, emoji }], () => renameDishAction({ listId, dishId: id, to: clean, emoji }), (r) => {
      if (!r.ok) toast({ message: tr(r.error === "exists" ? "dishExists" : "dishGone") });
    });
  }

  function saveAsRecipe(id: string) {
    start(async () => {
      try {
        const r = await saveDishAsRecipe({ listId, dishId: id });
        if (!r.ok) {
          toast({ message: tr("dishGone") });
          return;
        }
        toast({
          message: `${tr(r.created ? "savedRecipe" : "updatedRecipe")} · ${r.name}`,
          action: { label: tr("open"), icon: "open", run: () => router.push(`/recipes/${r.id}`) },
        });
      } catch {
        failed();
      }
    });
  }

  function clearDone() {
    const checked = board.items.map((item, at) => ({ item: settled(item), at })).filter((x) => x.item.checked);
    if (checked.length === 0) return;
    // Mirrors the server: a dish whose every ingredient was bought goes with them.
    const goneDishes = board.dishes
      .map((dish, at) => ({ dish: settledDish(dish), at }))
      .filter(({ dish }) => {
        const its = board.items.filter((i) => i.dish === dish.name);
        return its.length > 0 && its.every((i) => i.checked);
      });
    const n = checked.length;
    const token = run(
      [{ kind: "remove", ids: checked.map((x) => x.item.id) }, ...goneDishes.map(({ dish }) => ({ kind: "removeDish" as const, id: dish.id }))],
      () => clearChecked({ listId }),
    );
    offerUndo({
      full: n === 1 ? tr("clearedDoneOne") : fill(tr("clearedDone"), { n }),
      short: fill(tr("clearedShort"), { n }),
      restore: { kind: "restore", items: checked, dishes: goneDishes },
      token,
    });
  }

  function toggleItem(item: BoardItem, checked: boolean) {
    run([{ kind: "patch", id: item.id, patch: { checked } }], () => toggleItemAction({ itemId: item.id, checked }), itemGone);
  }

  function moveItem(item: BoardItem, categoryKey: string) {
    run([{ kind: "patch", id: item.id, patch: { categoryKey } }], () => moveItemAction({ itemId: item.id, categoryKey }), itemGone);
  }

  function editItem(item: BoardItem, text: string) {
    const [p] = parseInput(text);
    if (!p) return;
    run(
      [{ kind: "patch", id: item.id, patch: { name: p.name, alt: null, normalizedName: p.normalizedName, qty: p.qty, unit: p.unit } }],
      () => editItemAction({ itemId: item.id, text }),
      itemGone,
    );
  }

  function setItemDish(item: BoardItem, dishId: string | null) {
    const dish = dishId ? board.dishes.find((d) => d.id === dishId) : null;
    if (dishId && !dish) return;
    run(
      [{ kind: "patch", id: item.id, patch: { dish: dish?.name ?? null } }],
      () => setItemDishAction({ itemId: item.id, dishId }),
      (r) => {
        if (!r.ok) toast({ message: tr(r.error === "dish-gone" ? "dishGone" : "itemGone") });
      },
    );
  }

  return (
    <BoardContext.Provider
      value={{
        listId,
        board,
        recipes,
        view,
        setView,
        tips,
        hideTips,
        glow,
        addText,
        addToDish,
        createDish,
        removeItem,
        removeDish,
        renameDish,
        saveAsRecipe,
        clearDone,
        toggleItem,
        moveItem,
        editItem,
        setItemDish,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}
