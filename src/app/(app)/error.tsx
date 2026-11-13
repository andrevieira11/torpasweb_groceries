"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { useT } from "@/components/LangProvider";

/**
 * Safety net for the signed-in pages: a failure that slipped past a toast shows this instead
 * of Next's bare "This page couldn't load" — inside the app frame, in the user's language.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const tr = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-base font-semibold">{tr("errorTitle")}</p>
      <p className="max-w-[18rem] text-sm text-muted">{tr("errorBody")}</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-1 flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand"
      >
        <RotateCw className="size-4" aria-hidden />
        {tr("tryAgain")}
      </button>
    </div>
  );
}
