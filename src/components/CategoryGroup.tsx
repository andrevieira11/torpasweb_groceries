"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { CategoryColor } from "@/lib/categories";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_SOFT, CATEGORY_TEXT } from "./category-style";
import { ItemRow, type ItemView } from "./ItemRow";
import { ItemList } from "./board/ItemList";

export function CategoryGroup({
  label,
  color,
  icon,
  items,
  removable = false,
}: {
  label: string;
  color: CategoryColor;
  icon: string;
  items: ItemView[];
  removable?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const remaining = items.filter((i) => !i.checked).length;

  return (
    <motion.section layout="position" className="rounded-2xl border border-hairline bg-surface px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2.5 py-1"
      >
        <span className={`grid size-7 place-items-center rounded-lg ${CATEGORY_SOFT[color]}`}>
          <CategoryIcon name={icon} className={`size-4 ${CATEGORY_TEXT[color]}`} />
        </span>
        <span className="flex-1 text-left text-sm font-semibold">{label}</span>
        {remaining > 0 && (
          <span className="text-xs font-medium text-muted">{remaining}</span>
        )}
        <ChevronDown
          className={`size-4 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ItemList items={items} render={(item) => <ItemRow item={item} removable={removable} />} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
