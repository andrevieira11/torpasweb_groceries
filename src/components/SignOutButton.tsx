"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useT } from "./LangProvider";

export function SignOutButton() {
  const tr = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={tr("signOut")}
      onClick={async () => {
        await signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
      className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <LogOut className="size-5" />
    </button>
  );
}
