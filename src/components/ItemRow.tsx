"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { formatQuantity } from "@/lib/quantity";
import { deleteItem, moveItem, toggleItem } from "@/lib/actions/items";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_TEXT } from "./category-style";

export type ItemView = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  categoryKey: string;
  checked: boolean;
};

export function ItemRow({ item }: { item: ItemView }) {
  const router = useRouter();
  const [checked, setChecked] = useState(item.checked);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const qty = formatQuantity(item.qty, item.unit);

  function toggle() {
    const next = !checked;
    setChecked(next); // optimistic
    startTransition(async () => {
      try {
        await toggleItem({ itemId: item.id });
        router.refresh();
      } catch {
        setChecked(!next); // revert on failure
      }
    });
  }

  function move(categoryKey: string) {
    setOpen(false);
    startTransition(async () => {
      await moveItem({ itemId: item.id, categoryKey });
      router.refresh();
    });
  }

  function remove() {
    setOpen(false);
    startTransition(async () => {
      await deleteItem({ itemId: item.id });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl">
      <div className="flex items-center gap-3 py-1.5">
        <motion.button
          type="button"
          onClick={toggle}
          whileTap={{ scale: 0.88 }}
          aria-pressed={checked}
          aria-label={checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
          className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
            checked ? "border-brand bg-brand text-white" : "border-hairline bg-surface text-transparent"
          }`}
        >
          <motion.span
            initial={false}
            animate={{ scale: checked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </motion.span>
        </motion.button>

        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
        >
          <span
            className={`truncate text-[15px] transition-colors ${
              checked ? "text-muted line-through" : "text-fg"
            }`}
          >
            {item.name}
          </span>
          {qty && (
            <span className="shrink-0 text-xs font-medium text-muted">{qty}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Item options"
          aria-expanded={open}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <MoreHorizontal className="size-5" />
        </button>
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
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pl-9">
              {CATEGORIES.map((c) => {
                const current = c.key === item.categoryKey;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => move(c.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      current
                        ? "border-brand bg-brand/10 text-fg"
                        : "border-hairline text-muted hover:bg-surface-2"
                    }`}
                  >
                    <CategoryIcon name={c.icon} className={`size-3.5 ${CATEGORY_TEXT[c.color]}`} />
                    {c.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={remove}
                aria-label={`Delete ${item.name}`}
                className="ml-1 grid size-8 shrink-0 place-items-center rounded-full border border-hairline text-over transition-colors hover:bg-over/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
