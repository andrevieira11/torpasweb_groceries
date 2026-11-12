"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, FolderOpen } from "lucide-react";
import type { CategoryColor } from "@/lib/categories";
import { CategoryGroup } from "./CategoryGroup";
import type { ItemView } from "./ItemRow";

export type SectionCategory = {
  key: string;
  label: string;
  color: CategoryColor;
  icon: string;
  items: ItemView[];
};

/** A collapsible "compartment" inside one list (e.g. "Family lunch"), holding its own aisles. */
export function SectionGroup({
  listId,
  name,
  categories,
}: {
  listId: string;
  name: string;
  categories: SectionCategory[];
}) {
  const storageKey = `mrlist:section:${listId}:${name}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "closed") setOpen(false);
    } catch {}
  }, [storageKey]);

  const toggle = () =>
    setOpen((v) => {
      try {
        localStorage.setItem(storageKey, v ? "closed" : "open");
      } catch {}
      return !v;
    });

  const all = categories.flatMap((c) => c.items);
  const remaining = all.filter((i) => !i.checked).length;

  return (
    <section className="rounded-3xl border border-hairline bg-surface-2/60 p-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-2 py-2"
      >
        <FolderOpen className="size-5 text-muted" aria-hidden />
        <span className="flex-1 text-left text-base font-semibold">{name}</span>
        <span className="text-xs font-medium text-muted">
          {remaining > 0 ? `${remaining} left` : "all done ✓"}
        </span>
        <ChevronDown
          className={`size-5 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-2 pt-1">
          {categories.map((c) => (
            <CategoryGroup key={c.key} label={c.label} color={c.color} icon={c.icon} items={c.items} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
