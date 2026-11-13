"use client";

import { useEffect, useRef } from "react";
import { Check, UtensilsCrossed } from "lucide-react";
import { DISH_EMOJIS } from "@/lib/items/dish-emoji";
import { useT } from "../LangProvider";

/**
 * One swipeable row of dish icons. `value`: undefined = not picked yet (the suggestion shows as
 * selected), "" = the plain fork and knife (what a card shows without an emoji), else the
 * emoji. Selection = ring + check badge, never colour alone; the selected one is always
 * scrolled into view, also when it was picked for you from the name or a recipe. A suggestion
 * that isn't in the palette (the 🍟 a name starts with) gets its own first tile; picking it
 * means "automatic" again (undefined), so nothing outside the palette is ever saved.
 */
export function EmojiPicker({
  value,
  suggested,
  onChange,
}: {
  value: string | undefined;
  suggested: string | null;
  onChange: (v: string | undefined) => void;
}) {
  const tr = useT();
  const selected = value === undefined ? (suggested ?? "") : value;
  const own = suggested && !(DISH_EMOJIS as readonly string[]).includes(suggested) ? suggested : null;
  const options = ["", ...(own ? [own] : []), ...DISH_EMOJIS];
  const row = useRef<HTMLDivElement>(null);
  const on = useRef<HTMLButtonElement>(null);

  // Centre the selected icon in the row. Only this row scrolls (scrollIntoView could also move
  // the sheet or the page behind it while the sheet is still sliding in).
  useEffect(() => {
    const r = row.current;
    const b = on.current;
    if (!r || !b) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    r.scrollTo({ left: b.offsetLeft - (r.clientWidth - b.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [selected]);

  return (
    <div
      ref={row}
      role="radiogroup"
      aria-label={tr("icon")}
      className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((e) => {
        const checked = e === selected;
        return (
          <button
            key={e || "plain"}
            ref={checked ? on : undefined}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={e || tr("plainIcon")}
            onClick={() => onChange(e === own ? undefined : e)}
            className={`relative grid size-11 shrink-0 place-items-center rounded-2xl border text-2xl transition-colors ${
              checked ? "border-brand bg-brand/10 ring-2 ring-brand" : "border-hairline bg-bg"
            }`}
          >
            {e ? <span aria-hidden>{e}</span> : <UtensilsCrossed className="size-5 text-muted" aria-hidden />}
            {checked && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand text-on-brand">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
