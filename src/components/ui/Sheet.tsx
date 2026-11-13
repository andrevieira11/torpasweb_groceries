"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useT } from "../LangProvider";
import { useToastControls } from "../Toast";

/**
 * iOS-style bottom sheet: spring in, drag the handle down (or tap outside / Esc) to close.
 * It rides above the on-screen keyboard (visualViewport), so inputs never hide behind it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const tr = useT();
  const drag = useDragControls();
  const vp = useVisualViewport(open);
  const { dismiss } = useToastControls();

  // A toast left over from before (an Undo) would sit on top of the sheet's form.
  useEffect(() => {
    if (open) dismiss();
  }, [open, dismiss]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden"; // no scrolling the list behind the sheet
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            style={{ bottom: vp.inset, maxHeight: vp.height ? vp.height - 12 : undefined }}
            className="fixed inset-x-0 z-50 mx-auto flex max-h-[calc(100dvh-0.75rem)] w-full max-w-md flex-col rounded-t-3xl border border-hairline bg-surface shadow-2xl"
          >
            <div
              onPointerDown={(e) => drag.start(e)}
              className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5"
            >
              <div className="h-1 w-10 rounded-full bg-hairline" />
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-4 pr-1.5">
              <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("close")}
                className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>
            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 ${
                footer ? "pb-3" : "pb-[max(1rem,env(safe-area-inset-bottom))]"
              }`}
            >
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** How much the on-screen keyboard covers, and the visible height (0 = unknown). */
function useVisualViewport(active: boolean) {
  const [vp, setVp] = useState({ inset: 0, height: 0 });
  useEffect(() => {
    const v = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !v) return;
    const update = () =>
      setVp({
        inset: Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop)),
        height: Math.round(v.height),
      });
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    return () => {
      v.removeEventListener("resize", update);
      v.removeEventListener("scroll", update);
    };
  }, [active]);
  return active ? vp : { inset: 0, height: 0 };
}
