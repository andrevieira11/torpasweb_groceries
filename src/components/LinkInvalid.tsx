import Link from "next/link";
import { Unlink } from "lucide-react";

export function LinkInvalid({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Unlink className="size-7" />
      </div>
      <p className="text-lg font-semibold">Link unavailable</p>
      <p className="max-w-[20rem] text-sm text-muted">{message}</p>
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        Go to MrList
      </Link>
    </main>
  );
}
