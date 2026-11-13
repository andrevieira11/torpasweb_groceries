"use client";

import { useBoard } from "./board/BoardProvider";
import { useT } from "./LangProvider";

/** "Clear done (n)" — removes bought items (and dishes that are fully bought), with Undo. */
export function ClearCheckedButton() {
  const tr = useT();
  const { board, clearDone } = useBoard();
  const count = board.items.filter((i) => i.checked).length;
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={clearDone}
      aria-label={`${tr("clearDone")} (${count})`}
      className="min-h-11 shrink-0 px-1 text-sm font-medium text-muted transition-colors hover:text-fg"
    >
      {/* the short word on narrow phones, so the list name keeps its room */}
      <span className="min-[400px]:hidden">{tr("clearShort")}</span>
      <span className="hidden min-[400px]:inline">{tr("clearDone")}</span> ({count})
    </button>
  );
}
