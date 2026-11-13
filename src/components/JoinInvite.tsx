"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { joinList } from "@/lib/actions/sharing";
import { useT } from "./LangProvider";

export function JoinInvite({ token, listName }: { token: string; listName: string }) {
  const tr = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Users className="size-7" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">{tr("invitedToJoin")}</p>
        <p className="text-xl font-semibold tracking-tight">{listName}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await joinList({ token });
            router.replace("/");
            router.refresh();
          })
        }
        className="h-12 w-full max-w-xs rounded-2xl bg-brand text-base font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? tr("joining") : tr("joinList")}
      </button>
    </main>
  );
}
