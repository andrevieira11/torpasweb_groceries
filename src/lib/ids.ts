/**
 * Row ids the browser can mint for optimistic inserts (the server reuses them, so a pending
 * row keeps its identity once saved). `crypto.getRandomValues` works on plain-http LAN pages
 * too, unlike `crypto.randomUUID`. 128 random bits as lowercase hex.
 */
export const CLIENT_ID_RE = /^[a-z0-9]{16,40}$/;

export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return "c" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
