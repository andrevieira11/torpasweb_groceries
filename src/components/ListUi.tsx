"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VIEW_COOKIE, type View } from "@/lib/i18n/strings";
import { useT } from "./LangProvider";

const SectionsContext = createContext<string[]>([]);

/** The dishes/sections of the open list, so every item menu can offer "move to dish". */
export function SectionsProvider({ sections, children }: { sections: string[]; children: React.ReactNode }) {
  return <SectionsContext.Provider value={sections}>{children}</SectionsContext.Provider>;
}

export function useSections(): string[] {
  return useContext(SectionsContext);
}

/** "By aisle | By dish" — aisle view is for shopping (store order, each item tagged with its dish). */
export function ViewToggle({ view }: { view: View }) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (v: View) => {
    if (v === view) return;
    document.cookie = `${VIEW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  const btn = (v: View, label: string) => (
    <button
      type="button"
      onClick={() => set(v)}
      aria-pressed={view === v}
      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
        view === v ? "bg-brand text-white" : "text-muted"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex flex-col gap-1.5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex rounded-full border border-hairline bg-surface p-1">
        {btn("aisle", `🛒 ${tr("byAisle")}`)}
        {btn("dish", `🍽️ ${tr("byDish")}`)}
      </div>
      <p className="px-2 text-xs text-muted">{tr("viewHelp")}</p>
    </div>
  );
}
