"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, ShoppingBasket, X } from "lucide-react";
import { byAisle, dishView, type BoardDish, type BoardItem } from "@/lib/items/board";
import { getCategory } from "@/lib/categories";
import { categoryLabel, type View } from "@/lib/i18n/strings";
import { CategoryGroup } from "../CategoryGroup";
import { useLang, useT } from "../LangProvider";
import { useToastControls } from "../Toast";
import { useBoard } from "./BoardProvider";
import { DishCard, LooseCard } from "./DishCard";
import { DishMenu } from "./DishMenu";
import { NewDishSheet } from "./NewDishSheet";

/**
 * The list body: "By aisle" (shopping — store order, items tagged with their dish) or "By dish"
 * (editing — one card per dish with add/remove, then one card for items without a dish), plus
 * the ＋ New dish entry points (a floating thumb-reach button in the By-dish view).
 */
export function ListBoard() {
  const tr = useT();
  const { board, view, setView, tips, hideTips } = useBoard();
  const [newDish, setNewDish] = useState(0); // >0 = open; bumps give each opening a fresh form
  const [newOpen, setNewOpen] = useState(false);
  const [menu, setMenu] = useState<{ dish: BoardDish; open: boolean; key: number } | null>(null);

  const hasDishes = board.dishes.length > 0 || board.items.some((i) => i.dish);
  const shown: View = hasDishes ? view : "aisle";
  const empty = board.items.length === 0 && board.dishes.length === 0;
  const sheetOpen = newOpen || !!menu?.open;

  function openNewDish() {
    setNewDish((k) => k + 1);
    setNewOpen(true);
  }

  return (
    <>
      {hasDishes ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <ViewToggle view={shown} onChange={setView} />
            {shown === "aisle" && <NewDishButton onClick={openNewDish} />}
          </div>
          {tips && (
            <div className="flex items-start gap-1">
              <p className="min-w-0 flex-1 px-2 pt-1.5 text-xs text-muted">
                {tr(shown === "aisle" ? "viewHelpAisle" : "viewHelp")}
              </p>
              <button
                type="button"
                onClick={hideTips}
                aria-label={tr("hideTip")}
                className="-my-1 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        !empty && (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-hairline px-2 py-1.5">
            <NewDishButton onClick={openNewDish} />
            <p className="min-w-0 flex-1 text-xs text-muted">{tr("dishTip")}</p>
          </div>
        )
      )}

      {empty ? (
        <EmptyState onNewDish={openNewDish} />
      ) : shown === "aisle" ? (
        <AisleView items={board.items} />
      ) : (
        <DishesView
          onNewDish={openNewDish}
          onMenu={(id) => {
            const dish = board.dishes.find((d) => d.id === id);
            if (dish) setMenu({ dish, open: true, key: Date.now() });
          }}
        />
      )}

      {!empty && shown === "dish" && <NewDishFab onClick={openNewDish} hidden={sheetOpen} />}

      {newDish > 0 && <NewDishSheet key={newDish} open={newOpen} onClose={() => setNewOpen(false)} />}
      {menu && (
        <DishMenu
          key={menu.key}
          dish={menu.dish}
          open={menu.open}
          onClose={() => setMenu((m) => (m ? { ...m, open: false } : m))}
        />
      )}
    </>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tr = useT();
  const btn = (v: View, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={view === v}
      className={`relative flex min-h-11 min-w-0 flex-auto items-center justify-center gap-1 rounded-full px-2 text-[13px] font-semibold min-[400px]:px-2.5 min-[400px]:text-sm transition-colors ${
        view === v ? "text-on-brand" : "text-muted"
      }`}
    >
      {view === v && (
        <motion.span
          layoutId="view-pill"
          className="absolute inset-0 rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      {/* decorative; dropped on narrow phones (iPhone SE) so the words never get cut */}
      <span className="relative hidden min-[400px]:inline" aria-hidden>
        {icon}
      </span>
      <span className="relative truncate">{label}</span>
    </button>
  );
  return (
    <div className="flex min-w-0 flex-1 rounded-full border border-hairline bg-surface p-0.5">
      {btn("aisle", "🛒", tr("byAisle"))}
      {btn("dish", "🍽️", tr("byDish"))}
    </div>
  );
}

function NewDishButton({ onClick }: { onClick: () => void }) {
  const tr = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tr("newDish")}
      className="flex h-12 shrink-0 items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-3 text-sm font-semibold text-fg transition-colors hover:bg-brand/15"
    >
      <Plus className="size-4 text-brand" strokeWidth={2.8} aria-hidden />
      {tr("dishShort")}
    </button>
  );
}

/**
 * "＋ Dish" where the thumb is (bottom right, above the tab bar). It steps aside while a toast
 * or a sheet is up, so it never covers an Undo button or a form.
 */
function NewDishFab({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  const tr = useT();
  const { visible: toastUp } = useToastControls();
  const show = !hidden && !toastUp;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto flex max-w-md justify-end px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
    >
      <AnimatePresence>
        {show && (
          <motion.button
            key="fab"
            type="button"
            onClick={onClick}
            aria-label={tr("newDish")}
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className="pointer-events-auto flex h-12 items-center gap-1.5 rounded-full bg-brand px-4 text-[15px] font-semibold text-on-brand shadow-lg"
          >
            <Plus className="size-5" strokeWidth={2.8} aria-hidden />
            {tr("dishShort")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Groups({ items, showDish = false }: { items: BoardItem[]; showDish?: boolean }) {
  const lang = useLang();
  return (
    <AnimatePresence initial={false}>
      {byAisle(items).map((g) => {
        const c = getCategory(g.key);
        return (
          <motion.div
            key={g.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <CategoryGroup
              label={categoryLabel(lang, c.key, c.label)}
              color={c.color}
              icon={c.icon}
              items={showDish ? g.items.map((i) => ({ ...i, showDish: true })) : g.items}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

function AisleView({ items }: { items: BoardItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Groups items={items} showDish />
    </div>
  );
}

function DishesView({ onNewDish, onMenu }: { onNewDish: () => void; onMenu: (id: string) => void }) {
  const tr = useT();
  const { board } = useBoard();
  const { loose, dishes } = dishView(board);
  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {dishes.map((d) => (
          <DishCard key={d.id} dish={d} onMenu={onMenu} />
        ))}
        {loose.length > 0 && <LooseCard key="__loose" items={loose} />}
      </AnimatePresence>
      <motion.button
        layout="position"
        type="button"
        onClick={onNewDish}
        className="flex min-h-16 items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-hairline text-[15px] font-semibold text-muted transition-colors hover:border-brand/50 hover:text-fg"
      >
        <Plus className="size-5 text-brand" strokeWidth={2.6} aria-hidden />
        {tr("newDish")}
      </motion.button>
      {/* room for the floating ＋ button at the very end of the list */}
      <div className="h-14" aria-hidden />
    </div>
  );
}

function EmptyState({ onNewDish }: { onNewDish: () => void }) {
  const tr = useT();
  return (
    <div className="mt-2 flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <ShoppingBasket className="size-7" />
      </div>
      <p className="text-base font-medium">{tr("emptyTitle")}</p>
      <p className="max-w-[18rem] text-sm text-muted">{tr("emptyBody")}</p>
      <button
        type="button"
        onClick={onNewDish}
        className="mt-1 flex h-12 items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 text-sm font-semibold"
      >
        <Plus className="size-4 text-brand" strokeWidth={2.8} aria-hidden />
        {tr("newDish")}
      </button>
    </div>
  );
}
