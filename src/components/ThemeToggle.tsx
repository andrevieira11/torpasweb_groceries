"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useT } from "./LangProvider";

export function ThemeToggle() {
  const tr = useT();
  const { resolvedTheme, setTheme } = useTheme();

  // Icon is driven purely by the `.dark` class (set by next-themes before paint),
  // so there's no hydration mismatch and no mount-guard effect needed.
  return (
    <button
      type="button"
      aria-label={tr("toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  );
}
