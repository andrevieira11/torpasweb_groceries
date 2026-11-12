"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, t, type Lang, type StringKey } from "@/lib/i18n/strings";

const LangContext = createContext<Lang>("pt");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): (key: StringKey) => string {
  const lang = useLang();
  return (key) => t(lang, key);
}

/** One tap: PT ⇄ EN for the whole app (UI + item names). Remembered for a year. */
export function LangToggle() {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "pt" ? "en" : "pt";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      aria-label={t(lang, "switchLang")}
      className={`flex h-9 items-center rounded-full border border-hairline px-1 text-xs font-semibold ${pending ? "opacity-60" : ""}`}
    >
      <span className={`rounded-full px-2 py-1 ${lang === "pt" ? "bg-brand text-white" : "text-muted"}`}>PT</span>
      <span className={`rounded-full px-2 py-1 ${lang === "en" ? "bg-brand text-white" : "text-muted"}`}>EN</span>
    </button>
  );
}
