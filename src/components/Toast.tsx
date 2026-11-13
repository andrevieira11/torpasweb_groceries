"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus, Undo2 } from "lucide-react";

type ToastAction = { label: string; icon?: "undo" | "open" | "add"; run: () => void };
export type ToastInput = {
  message: string;
  action?: ToastAction;
  duration?: number;
  /** A toast with the same key updates the one on screen in place (no new slide-in). */
  key?: string;
  /** Called once when this toast goes away (timer, replaced by another, dismissed, acted on). */
  onClose?: () => void;
};
type Shown = ToastInput & { id: number };

type Controls = { show: (t: ToastInput) => void; dismiss: () => void; visible: boolean };
const ToastContext = createContext<Controls>({ show: () => {}, dismiss: () => {}, visible: false });

/** Show a toast above the tab bar ("Removed “bacon” · Undo"). A new one replaces it. */
export function useToast() {
  return useContext(ToastContext).show;
}

/** dismiss(): clear the toast now (a sheet opening); visible: is one showing (floating buttons). */
export function useToastControls() {
  const { dismiss, visible } = useContext(ToastContext);
  return { dismiss, visible };
}

let nextId = 1;
/** A toast's button ignores taps this soon after it appeared: a double tap on ⊖ must not Undo. */
const TAP_GUARD_MS = 450;
/** Enough time to reach the button with a thumb, or with VoiceOver. */
const MIN_ACTION_MS = 10_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const current = useRef<Shown | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadline = useRef(0); // when the running timer fires
  const remaining = useRef(0); // ms left while paused
  const shownAt = useRef(0);

  const close = useCallback((id: number) => {
    const t = current.current;
    if (!t || t.id !== id) return;
    clearTimeout(timer.current);
    current.current = null;
    setToast(null);
    t.onClose?.();
  }, []);

  const arm = useCallback(
    (id: number, ms: number) => {
      clearTimeout(timer.current);
      deadline.current = Date.now() + ms;
      timer.current = setTimeout(() => close(id), ms);
    },
    [close],
  );

  const show = useCallback(
    (t: ToastInput) => {
      const prev = current.current;
      const same = !!prev && !!t.key && prev.key === t.key;
      // Replaced by a different toast: the old one is done.
      if (prev && !same) prev.onClose?.();
      const id = same ? prev!.id : nextId++;
      const next: Shown = { ...t, id };
      current.current = next;
      shownAt.current = Date.now();
      setToast(next);
      const ms = Math.max(t.duration ?? 6000, t.action ? MIN_ACTION_MS : 0);
      remaining.current = ms;
      arm(id, ms);
    },
    [arm],
  );

  const dismiss = useCallback(() => {
    if (current.current) close(current.current.id);
  }, [close]);

  // Paused while a finger, a pointer or VoiceOver focus is on it (WCAG 2.2.1).
  const pause = useCallback(() => {
    if (!current.current) return;
    clearTimeout(timer.current);
    remaining.current = Math.max(1500, deadline.current - Date.now());
  }, []);
  const resume = useCallback(() => {
    if (current.current) arm(current.current.id, remaining.current);
  }, [arm]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, dismiss, visible: !!toast }), [show, dismiss, toast]);
  const Icon = toast?.action?.icon === "open" ? ArrowRight : toast?.action?.icon === "add" ? Plus : Undo2;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ y: 24, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 520, damping: 36 }}
              onPointerEnter={pause}
              onPointerLeave={resume}
              onFocus={pause}
              onBlur={resume}
              className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl bg-fg py-1 pl-4 pr-1 text-bg shadow-lg"
            >
              <span className="line-clamp-2 min-w-0 flex-1 break-words py-2 text-sm font-medium leading-snug">
                {toast.message}
              </span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    if (Date.now() - shownAt.current < TAP_GUARD_MS) return;
                    const run = toast.action!.run;
                    close(toast.id);
                    run();
                  }}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-bg/15 px-3.5 text-sm font-semibold transition-colors hover:bg-bg/25"
                >
                  <Icon className="size-4" strokeWidth={2.4} aria-hidden />
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
