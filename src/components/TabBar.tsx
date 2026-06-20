"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ListChecks } from "lucide-react";

const TABS = [
  { href: "/", label: "List", icon: ListChecks },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-brand" : "text-muted hover:text-fg"
              }`}
            >
              <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
