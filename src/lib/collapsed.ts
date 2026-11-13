"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-device "this card is collapsed" memory (localStorage: `mrlist:dish:<list>:<dish id>` =
 * "closed"). An external store, so the server renders every card open and the client catches
 * up after hydration — no setState-in-effect.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "closed";
  } catch {
    return false;
  }
}

export function setCollapsed(key: string, collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(key, "closed");
    else localStorage.removeItem(key);
  } catch {}
  for (const l of listeners) l();
}

/** By dish id, so a rename keeps the card's state (and the "No dish" card has its own key). */
export function dishKey(listId: string, dishId: string | null) {
  return dishId ? `mrlist:dish:${listId}:${dishId}` : `mrlist:loose:${listId}`;
}

export function useCollapsed(key: string): [boolean, (v: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, () => read(key), () => false);
  const set = useCallback((v: boolean) => setCollapsed(key, v), [key]);
  return [collapsed, set];
}
