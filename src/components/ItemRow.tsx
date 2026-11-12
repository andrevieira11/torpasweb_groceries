"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { formatQuantity } from "@/lib/quantity";
import { deleteItem, editItem, moveItem, setItemSection, toggleItem } from "@/lib/actions/items";
import { useSections } from "./ListUi";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_TEXT } from "./category-style";
import { useLang, useT } from "./LangProvider";
import { categoryLabel } from "@/lib/i18n/strings";

export type ItemView = {
  id: string;
  name: string;
  alt?: string | null; // same item in the other language
  dish?: string | null; // its section; shown as a tag in the aisle view
  showDish?: boolean;
  qty: number | null;
  unit: string | null;
  categoryKey: string;
  checked: boolean;
};

export function ItemRow({ item }: { item: ItemView }) {
  const router = useRouter();
  const tr = useT();
  const lang = useLang();
  const [checked, setChecked] = useState(item.checked);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const sections = useSections();
  const [draft, setDraft] = useState("");
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

  function startEdit() {
    setDraft([formatQuantity(item.qty, item.unit), item.name].filter(Boolean).join(" "));
    setEditing(true);
  }

  function saveEdit() {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    setOpen(false);
    startTransition(async () => {
      await editItem({ itemId: item.id, text });
      router.refresh();
    });
  }

  function moveDish(section: string | null) {
    setOpen(false);
    startTransition(async () => {
      await setItemSection({ itemId: item.id, section });
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
            {item.alt && (
              <span className="ml-1.5 text-xs font-normal text-muted">· {item.alt}</span>
            )}
          </span>
          {qty && (
            <span className="shrink-0 text-xs font-medium text-muted">{qty}</span>
          )}
          {item.showDish && item.dish && (
            <span className="shrink-0 truncate rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {item.dish}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={tr("itemOptions")}
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
            <div className="flex flex-col gap-2.5 pb-3 pl-9 pr-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-hairline bg-bg px-3 text-[15px] outline-none focus:border-brand"
                  />
                  <button type="button" onClick={saveEdit} className="h-10 rounded-xl bg-brand px-3 text-sm font-semibold text-white">
                    {tr("save")}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-xl border border-hairline px-3 text-sm text-muted">
                    {tr("cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline text-sm font-semibold"
                  >
                    <Pencil className="size-4" /> {tr("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    aria-label={`${tr("delete")} ${item.name}`}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline text-sm font-semibold text-over"
                  >
                    <Trash2 className="size-4" /> {tr("delete")}
                  </button>
                </div>
              )}

              {sections.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{tr("dish")}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...sections, null].map((sec) => {
                      const current = (item.dish ?? null) === sec;
                      return (
                        <button
                          key={sec ?? "__none"}
                          type="button"
                          onClick={() => moveDish(sec)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            current ? "border-brand bg-brand/10 text-fg" : "border-hairline text-muted"
                          }`}
                        >
                          {sec ?? tr("noDish")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{tr("aisle")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const current = c.key === item.categoryKey;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => move(c.key)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          current ? "border-brand bg-brand/10 text-fg" : "border-hairline text-muted hover:bg-surface-2"
                        }`}
                      >
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
