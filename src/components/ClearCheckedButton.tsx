"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearChecked } from "@/lib/actions/items";

export function ClearCheckedButton({
  listId,
  count,
}: {
  listId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearChecked({ listId });
          router.refresh();
        })
      }
      className="text-sm font-medium text-muted transition-colors hover:text-fg disabled:opacity-50"
    >
      Clear done ({count})
    </button>
  );
}
