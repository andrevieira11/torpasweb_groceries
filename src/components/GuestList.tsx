"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import type { CategoryColor } from "@/lib/categories";
import { formatQuantity } from "@/lib/quantity";
import { guestAddItems, guestToggleItem } from "@/lib/actions/guest";
import { CategoryIcon } from "./CategoryIcon";
import { CATEGORY_SOFT, CATEGORY_TEXT } from "./category-style";

type GItem = { id: string; name: string; qty: number | null; unit: string | null; checked: boolean };
type GGroup = { label: string; color: CategoryColor; icon: string; items: GItem[] };

const NAME_KEY = "mrlist_guest_name";

export function GuestList({
  token,
  listName,
  groups,
}: {
  token: string;
  listName: string;
  groups: GGroup[];
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  // Prefill the saved guest name by writing the DOM value (no state-in-effect).
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved && nameRef.current) nameRef.current.value = saved;
  }, []);

  function submit() {
    const value = text.trim();
    if (!value) return;
    const displayName = nameRef.current?.value.trim() || null;
    if (displayName) localStorage.setItem(NAME_KEY, displayName);
    startTransition(async () => {
      await guestAddItems({ token, text: value, displayName });
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Shared list</span>
        <h1 className="text-2xl font-semibold tracking-tight">{listName}</h1>
      </div>

      <input
        ref={nameRef}
        placeholder="Your name (optional)"
        aria-label="Your name"
        maxLength={40}
        className="h-11 rounded-2xl border border-hairline bg-surface px-4 text-fg outline-none focus:border-brand"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="done"
          placeholder="Add — e.g. milk, 2kg potatoes"
          aria-label="Add items"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-fg outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label="Add"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white transition-opacity disabled:opacity-40"
        >
          <Plus className="size-5" strokeWidth={2.6} />
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted">
          Nothing here yet — add the first item above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <section key={g.label} className="rounded-2xl border border-hairline bg-surface px-3 py-2">
              <div className="flex items-center gap-2.5 py-1.5">
                <span className={`grid size-7 place-items-center rounded-lg ${CATEGORY_SOFT[g.color]}`}>
                  <CategoryIcon name={g.icon} className={`size-4 ${CATEGORY_TEXT[g.color]}`} />
                </span>
                <span className="text-sm font-semibold">{g.label}</span>
              </div>
              <ul className="flex flex-col divide-y divide-hairline/60">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <GuestItemRow token={token} item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestItemRow({ token, item }: { token: string; item: GItem }) {
  const router = useRouter();
  const [checked, setChecked] = useState(item.checked);
  const [, startTransition] = useTransition();
  const qty = formatQuantity(item.qty, item.unit);

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await guestToggleItem({ token, itemId: item.id });
        router.refresh();
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <button type="button" onClick={toggle} className="flex w-full items-center gap-3 py-2 text-left">
      <motion.span
        whileTap={{ scale: 0.88 }}
        className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
          checked ? "border-brand bg-brand text-white" : "border-hairline bg-surface text-transparent"
        }`}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </motion.span>
      <span className={`min-w-0 flex-1 truncate text-[15px] transition-colors ${checked ? "text-muted line-through" : "text-fg"}`}>
        {item.name}
      </span>
      {qty && <span className="shrink-0 text-xs font-medium text-muted">{qty}</span>}
    </button>
  );
}
