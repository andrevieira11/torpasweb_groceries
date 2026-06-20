"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={async () => {
        await signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <LogOut className="size-5" />
    </button>
  );
}
