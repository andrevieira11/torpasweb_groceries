"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MoreHorizontal, Plus, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import type { BoardItem, DishGroup } from "@/lib/items/board";
import { dishDisplay } from "@/lib/items/dish-emoji";
import { dishKey, useCollapsed } from "@/lib/collapsed";
import { fill } from "@/lib/i18n/strings";
import { ItemRow } from "../ItemRow";
import { useT } from "../LangProvider";
import { addInputId, dishDomId, isOrphan, LOOSE_DOM_ID, useBoard } from "./BoardProvider";
import { ItemList } from "./ItemList";

/**
 * One dish: emoji + name (up to two lines — the name is what matters) with what's left under
 * it, ⋯ for rename / save as recipe / remove, its ingredients (each with a ⊖), and an
 * always-there "+ Add to <dish>…" row at the bottom.
 */
export function DishCard({ dish, onMenu }: { dish: DishGroup; onMenu: (id: string) => void }) {
  const tr = useT();
  const { glow } = useBoard();
  const { icon, label } = dishDisplay(dish);
  const orphan = isOrphan(dish);
  return (
    <BoardCard
      domId={dishDomId(dish.id)}
      dishId={orphan ? null : dish.id}
      collapseKey={dish.id}
      title={label}
      icon={icon ?? <UtensilsCrossed className="size-5 text-muted" />}
      items={dish.items}
      glowing={glow === dish.id}
      busy={orphan}
      placeholder={fill(tr("addToDishPlaceholder"), { name: label })}
      menu={
        orphan ? null : (
          <button
            type="button"
            onClick={() => onMenu(dish.id)}
            aria-label={`${tr("dishOptions")} — ${label}`}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <MoreHorizontal className="size-5" />
          </button>
        )
      }
      dataName={dish.name}
    />
  );
}

/** Items without a dish, as one card at the end of the By-dish view (same look, own add row). */
export function LooseCard({ items }: { items: BoardItem[] }) {
  const tr = useT();
  return (
    <BoardCard
      domId={LOOSE_DOM_ID}
      dishId={null}
      collapseKey={null}
      title={tr("noDish")}
      icon={<ShoppingBasket className="size-5 text-muted" />}
      items={items}
      glowing={false}
      busy={false}
      placeholder={tr("addLoosePlaceholder")}
      menu={null}
    />
  );
}

function BoardCard({
  domId,
  dishId,
  collapseKey,
  title,
  icon,
  items,
  glowing,
  busy,
  placeholder,
  menu,
  dataName,
}: {
  domId: string;
  /** Where the add row adds: a dish id, or null for "no dish". */
  dishId: string | null;
  collapseKey: string | null;
  title: string;
  icon: React.ReactNode;
  items: BoardItem[];
  glowing: boolean;
  busy: boolean;
  placeholder: string;
  menu: React.ReactNode;
  dataName?: string;
}) {
  const tr = useT();
  const { listId } = useBoard();
  const [collapsed, setCollapsed] = useCollapsed(dishKey(listId, collapseKey));
  const open = !collapsed;
  const remaining = items.filter((i) => !i.checked).length;
  const status = remaining > 0 ? `${remaining} ${tr("left")}` : items.length > 0 ? tr("allDone") : "";

  return (
    <motion.section
      id={domId}
      data-dish-name={dataName}
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      aria-busy={busy || undefined}
      className={`scroll-mt-36 rounded-3xl border bg-surface p-1.5 transition-[box-shadow,border-color] duration-500 ${
        glowing ? "border-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_25%,transparent)]" : "border-hairline"
      }`}
    >
      <div className="flex items-center">
        <button
          type="button"
          data-card-toggle
          onClick={() => setCollapsed(open)}
          aria-expanded={open}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1.5 py-1 text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl" aria-hidden>
            {icon}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 break-words text-base font-semibold leading-tight">{title}</span>
            {status && <span className="text-xs font-medium text-muted">{status}</span>}
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>
        {menu}
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
            <div className="px-2.5 pb-1">
              {items.length === 0 ? (
                <p className="py-2 text-sm text-muted">{tr("noIngredients")}</p>
              ) : (
                <ItemList items={items} render={(item) => <ItemRow item={item} removable />} />
              )}
              {!busy && <AddRow dishId={dishId} title={title} placeholder={placeholder} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Type "200 g bacon, natas" + Return: added to this card, field clears, keyboard stays up. */
function AddRow({ dishId, title, placeholder }: { dishId: string | null; title: string; placeholder: string }) {
  const tr = useT();
  const { addToDish } = useBoard();
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const id = addInputId(dishId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    addToDish(dishId, value);
    setText("");
    input.current?.focus();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-1 mt-1.5 flex items-center gap-1 rounded-2xl border border-dashed border-hairline pr-1 transition-colors focus-within:border-solid focus-within:border-brand"
    >
      <label htmlFor={id} className="grid size-11 shrink-0 place-items-center text-brand" aria-hidden>
        <Plus className="size-5" strokeWidth={2.6} />
      </label>
      <input
        ref={input}
        id={id}
        data-add-row
        value={text}
        onChange={(e) => setText(e.target.value)}
        enterKeyHint="enter"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={`${tr("addIngredient")} — ${title}`}
        className="h-11 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-muted"
      />
      <AnimatePresence initial={false}>
        {text.trim() && (
          <motion.button
            type="submit"
            // keep the focus (and the iPhone keyboard) in the field
            onMouseDown={(e) => e.preventDefault()}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="h-11 shrink-0 rounded-xl bg-brand px-3.5 text-sm font-semibold text-on-brand"
          >
            {tr("add")}
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}
