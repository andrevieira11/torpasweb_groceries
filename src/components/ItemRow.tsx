"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { Check, CircleMinus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { displayQuantity, formatQuantity } from "@/lib/quantity";
import { dishDisplay } from "@/lib/items/dish-emoji";
import type { BoardItem } from "@/lib/items/board";
import { useBoard } from "./board/BoardProvider";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_TEXT } from "./category-style";
import { useLang, useT } from "./LangProvider";
import { categoryLabel, fill } from "@/lib/i18n/strings";

export type ItemView = BoardItem & { showDish?: boolean };

const SWIPE_REMOVE_PX = 96;

/**
 * One item: tap to check off; ⋯ for edit / delete / dish / aisle. Swipe left removes it (with
 * Undo). `removable` adds a visible ⊖ button — the By-dish view is where lists get edited.
 * Every change goes through the board (optimistic, and a failure is a toast, never a crash).
 */
export function ItemRow({ item, removable = false }: { item: ItemView; removable?: boolean }) {
  const tr = useT();
  const lang = useLang();
  const { board, removeItem, toggleItem, moveItem, editItem, setItemDish } = useBoard();
  const checked = item.checked;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const x = useMotionValue(0);
  const dragged = useRef(false);

  // The strip behind the row is exactly as wide as the gap the row leaves: the bin shows from
  // the first pixels, the word joins once there is room, and past the threshold the bin grows
  // ("let go to remove", told by shape, not colour).
  const stripW = useTransform(x, (v) => Math.max(0, -v));
  const wordW = useTransform(x, [-150, -92], [80, 0]);
  const wordO = useTransform(x, [-130, -95], [1, 0]);
  const binScale = useTransform(x, [-SWIPE_REMOVE_PX - 2, -SWIPE_REMOVE_PX + 6], [1.3, 1]);

  const qty = displayQuantity(item.qty, item.unit);
  const pending = !!item.pending;

  function toggle() {
    if (dragged.current || pending) return;
    toggleItem(item, !checked);
  }

  function move(categoryKey: string) {
    setOpen(false);
    if (categoryKey !== item.categoryKey) moveItem(item, categoryKey);
  }

  function startEdit() {
    setDraft([formatQuantity(item.qty, item.unit), item.name].filter(Boolean).join(" "));
    setEditing(true);
  }

  function saveEdit() {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    setOpen(false);
    editItem(item, text);
  }

  function moveDish(dishId: string | null) {
    setOpen(false);
    const now = item.dish ? board.dishes.find((d) => d.name === item.dish)?.id ?? null : null;
    if (dishId !== now) setItemDish(item, dishId);
  }

  function remove(): boolean {
    if (dragged.current) return false; // the end of a drag, not a tap
    setOpen(false);
    return removeItem(item);
  }

  /** ⊖: remove, then keep the keyboard / VoiceOver place — the next row's ⊖, or the card. */
  function removeFromButton(e: React.MouseEvent<HTMLButtonElement>) {
    const li = e.currentTarget.closest("li");
    const sibling = (li?.nextElementSibling ?? li?.previousElementSibling) as HTMLElement | null;
    const next = sibling?.querySelector<HTMLElement>("[data-remove]");
    const card = li?.closest("section");
    const byKeyboard = e.detail === 0;
    if (!remove()) return;
    const target =
      next ??
      (byKeyboard
        ? card?.querySelector<HTMLElement>("[data-add-row]")
        : card?.querySelector<HTMLElement>("[data-card-toggle]"));
    target?.focus({ preventScroll: true });
  }

  return (
    <div className={pending ? "pointer-events-none opacity-55" : undefined} aria-busy={pending || undefined}>
      {/* overflow-clip, not -hidden: a focused ⋯ must not scroll the row sideways (it pokes out). */}
      <div className="relative overflow-clip rounded-xl">
        {/* Revealed by swiping left: bin + word, so it reads without colour. */}
        <motion.div
          aria-hidden
          style={{ width: stripW }}
          className="absolute inset-y-0 right-0 flex items-center justify-center overflow-hidden rounded-xl bg-over/15 text-sm font-semibold text-over"
        >
          <motion.span style={{ scale: binScale }} className="grid shrink-0 place-items-center">
            <Trash2 className="size-4" />
          </motion.span>
          <motion.span style={{ maxWidth: wordW, opacity: wordO }} className="overflow-hidden whitespace-nowrap">
            <span className="pl-1.5">{tr("remove")}</span>
          </motion.span>
        </motion.div>

        <motion.div
          drag={pending ? false : "x"}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.8, right: 0.04 }}
          style={{ x }}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_, info) => {
            setTimeout(() => (dragged.current = false), 0);
            if (info.offset.x < -SWIPE_REMOVE_PX || (info.velocity.x < -600 && info.offset.x < -40)) {
              setOpen(false);
              removeItem(item);
            }
          }}
          className="relative flex items-center bg-surface"
        >
          <motion.button
            type="button"
            onClick={toggle}
            whileTap={{ scale: 0.88 }}
            aria-pressed={checked}
            aria-label={fill(tr(checked ? "uncheckItem" : "checkItem"), { name: item.name })}
            className="-ml-2 grid size-11 shrink-0 place-items-center"
          >
            <span
              className={`grid size-6 place-items-center rounded-full border transition-colors ${
                checked ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface text-transparent"
              }`}
            >
              <motion.span
                initial={false}
                animate={{ scale: checked ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
            </span>
          </motion.button>

          <button
            type="button"
            onClick={toggle}
            className="flex min-h-11 min-w-0 flex-1 items-baseline gap-2 py-2 text-left"
          >
            <span
              className={`min-w-0 truncate text-[15px] transition-colors ${
                checked ? "text-muted line-through" : "text-fg"
              }`}
            >
              {item.name}
              {item.alt && (
                <span
                  className={`ml-1.5 text-xs font-normal text-muted ${item.showDish ? "hidden min-[400px]:inline" : ""}`}
                >
                  · {item.alt}
                </span>
              )}
            </span>
            {qty && <span className="shrink-0 text-xs font-medium text-muted">{qty}</span>}
            {item.showDish && item.dish && <DishTag name={item.dish} />}
          </button>

          {removable && (
            <button
              type="button"
              data-remove
              onClick={removeFromButton}
              aria-label={fill(tr("removeItem"), { name: item.name })}
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-over/10 hover:text-over"
            >
              <CircleMinus className="size-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!dragged.current) setOpen((v) => !v);
            }}
            aria-label={fill(tr("itemOptionsFor"), { name: item.name })}
            aria-expanded={open}
            className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 pb-3 pl-9 pr-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    aria-label={tr("edit")}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-hairline bg-bg px-3 text-[15px] outline-none focus:border-brand"
                  />
                  <button type="button" onClick={saveEdit} className="h-11 rounded-xl bg-brand px-3 text-sm font-semibold text-on-brand">
                    {tr("save")}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-xl border border-hairline px-3 text-sm text-muted">
                    {tr("cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline text-sm font-semibold"
                  >
                    <Pencil className="size-4" /> {tr("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    aria-label={`${tr("delete")} ${item.name}`}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline text-sm font-semibold text-over"
                  >
                    <Trash2 className="size-4" /> {tr("delete")}
                  </button>
                </div>
              )}

              {board.dishes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{tr("dish")}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...board.dishes, null].map((d) => {
                      const current = (item.dish ?? null) === (d?.name ?? null);
                      const look = d ? dishDisplay(d) : null;
                      return (
                        <button
                          key={d?.id ?? "__none"}
                          type="button"
                          onClick={() => moveDish(d?.id ?? null)}
                          aria-pressed={current}
                          className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs ${
                            current ? "border-brand bg-brand/10 font-semibold text-fg" : "border-hairline font-medium text-muted"
                          }`}
                        >
                          {current && <Check className="size-3.5" strokeWidth={2.6} aria-hidden />}
                          {look?.icon && <span aria-hidden>{look.icon}</span>}
                          {look?.label ?? tr("noDish")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{tr("aisle")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const current = c.key === item.categoryKey;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => move(c.key)}
                        aria-pressed={current}
                        className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                          current
                            ? "border-brand bg-brand/10 font-semibold text-fg"
                            : "border-hairline font-medium text-muted hover:bg-surface-2"
                        }`}
                      >
                        {current && <Check className="size-3.5" strokeWidth={2.6} aria-hidden />}
                        <CategoryIcon name={c.icon} className={`size-3.5 ${CATEGORY_TEXT[c.color]}`} />
                        {categoryLabel(lang, c.key, c.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The dish an item belongs to, as a small tag in the aisle view (emoji = shape cue). On narrow
 * phones it is the emoji alone (the name stays for screen readers), so the item name keeps the room.
 */
function DishTag({ name }: { name: string }) {
  const { board } = useBoard();
  const d = board.dishes.find((x) => x.name === name) ?? { name, emoji: null };
  const { icon, label } = dishDisplay(d);
  return (
    <span
      title={label}
      className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted min-[400px]:min-w-0 min-[400px]:shrink-[3]"
    >
      {icon ? (
        <span aria-hidden>{icon}</span>
      ) : (
        <span aria-hidden className="min-[400px]:hidden">
          {Array.from(label).slice(0, 3).join("")}
        </span>
      )}
      <span className="sr-only min-[400px]:not-sr-only min-[400px]:truncate">{label}</span>
    </span>
  );
}
