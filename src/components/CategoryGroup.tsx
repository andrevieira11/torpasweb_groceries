"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { CategoryColor } from "@/lib/categories";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_SOFT, CATEGORY_TEXT } from "./category-style";
import { ItemRow, type ItemView } from "./ItemRow";

export function CategoryGroup({
  label,
  color,
  icon,
  items,
}: {
  label: string;
  color: CategoryColor;
  icon: string;
  items: ItemView[];
}) {
  const [open, setOpen] = useState(true);
  const remaining = items.filter((i) => !i.checked).length;

  return (
    <section className="rounded-2xl border border-hairline bg-surface px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 py-1.5"
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

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <ul className="flex flex-col divide-y divide-hairline/60 pb-1">
          {items.map((item) => (
            <li key={item.id}>
              <ItemRow item={item} />
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
