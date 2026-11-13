import { normalizeName } from "@/lib/parse/normalize";

/**
 * Is a machine translation of an item name believable? Free MT sometimes answers a grocery
 * word with junk ("pato" → "&Mudo", "azeitonas" → "▲Olives", "caril" → "Charles
 * Starkweather"). Pure, so the list can also hide junk that was saved before this check —
 * and since cached translations are judged when they are read, a change here applies to old
 * rows too.
 *
 * - It starts like a word: a letter, a digit or "(" ("1.5 L water", "(2 sacos)").
 * - Every character that isn't a letter, a space or ' ’ . - is one the source has too: the
 *   "(2 bags)" of "gelo (2 sacos)" passes, "&", "▲" and "<g id…>" don't.
 * - Size: a one-word name may become at most 3 words (3× its length, at least 8 characters);
 *   a longer name may grow to 5× its length and 3× its words ("pet food" → "alimentação para
 *   animais de estimação").
 */
const START = /^[\p{L}\p{M}\d(]/u;
const PLAIN = /[\p{L}\p{M}\s'’.-]/u;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function plausibleTranslation(src: string, out: string): boolean {
  const o = out.trim();
  const s = src.trim();
  if (!o || !START.test(o)) return false;
  for (const ch of o) if (!PLAIN.test(ch) && !s.includes(ch)) return false;
  const n = words(s);
  if (n <= 1) return o.length <= Math.max(3 * s.length, 8) && words(o) <= 3;
  return o.length <= 5 * s.length && words(o) <= 3 * n;
}

/** A saved name is usable for `src` when it is the typed word itself or a believable translation. */
export function usableName(src: string, out: string | null | undefined): out is string {
  return !!out && (normalizeName(out) === normalizeName(src) || plausibleTranslation(src, out));
}
