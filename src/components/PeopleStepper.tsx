"use client";

import { Minus, Plus, Users } from "lucide-react";
import { clampPeople } from "@/lib/recipes/scale";
import { peopleCount } from "@/lib/i18n/strings";
import { useLang, useT } from "./LangProvider";

/** "👥 − 2 people +" — big tap targets, the number spelled out (not colour) so it reads at a glance. */
export function PeopleStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const tr = useT();
  const lang = useLang();
  const btn =
    "grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg transition-colors hover:bg-hairline disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={tr("howManyPeople")}>
      <button
        type="button"
        onClick={() => onChange(clampPeople(value - 1))}
        disabled={disabled || value <= 1}
        aria-label={tr("onePersonLess")}
        className={btn}
      >
        <Minus className="size-5" strokeWidth={2.6} />
      </button>
      <span className="flex min-w-[6.5rem] items-center justify-center gap-1.5 text-[15px] font-semibold" aria-live="polite">
        <Users className="size-4 text-muted" aria-hidden />
        {peopleCount(lang, value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(clampPeople(value + 1))}
        disabled={disabled || value >= 50}
        aria-label={tr("onePersonMore")}
        className={btn}
      >
        <Plus className="size-5" strokeWidth={2.6} />
      </button>
    </div>
  );
}
