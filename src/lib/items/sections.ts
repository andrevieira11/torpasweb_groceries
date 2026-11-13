/**
 * Optional sections inside one list ("compartments"): a line written as
 * "Family lunch: cod, potatoes" puts those items in the "Family lunch" section.
 * Lines without a "Name:" prefix keep the section of the line above (or none).
 * Pure — no I/O — so it is easy to test.
 */
import { accentFold, normalizeName } from "@/lib/parse/normalize";

export type SectionChunk = { section: string | null; text: string };

const MAX_SECTION = 40;

export function cleanSection(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, MAX_SECTION) : null;
}

export function splitSections(text: string): SectionChunk[] {
  const out: SectionChunk[] = [];
  let current: string | null = null;
  for (const line of text.split(/\n/)) {
    const m = /^\s*([^:,;\n\d][^:,;\n]{0,39}):\s*(.*)$/.exec(line);
    let body = line;
    if (m && !/^\s*https?$/i.test(m[1])) {
      current = cleanSection(m[1]);
      body = m[2];
    }
    if (body.trim()) out.push({ section: current, text: body });
  }
  return out;
}

/**
 * What normalizeName() drops but still tells two dish names apart: emoji, symbols and
 * non-Latin letters ("🍕" vs "🎂", "寿司" vs "ラーメン"). Punctuation and marks don't count.
 */
function extras(s: string): string {
  return accentFold(s.toLocaleLowerCase()).replace(/[a-z0-9\s\p{P}\p{M}]/gu, "");
}

/**
 * One emoji at the very start of a name — with its variation selector, skin tone and any
 * ZWJ parts ("👨‍🍳"), or a flag — and the spaces after it.
 */
const LEADING_EMOJI =
  /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}[\u{FE0F}\p{Emoji_Modifier}]*(?:\u{200D}\p{Extended_Pictographic}[\u{FE0F}\p{Emoji_Modifier}]*)*)\s*/u;

/**
 * "🍕 Pizza (6)" → { emoji: "🍕", rest: "Pizza (6)" }; null when the name doesn't start with an
 * emoji. `rest` is "" for an emoji-only name.
 */
export function splitLeadingEmoji(name: string): { emoji: string; rest: string } | null {
  const s = name.trim();
  const m = LEADING_EMOJI.exec(s);
  return m ? { emoji: m[0].trim(), rest: s.slice(m[0].length).trim() } : null;
}

/** The part of a dish name that identifies it: a leading emoji only counts when there's no text. */
function dishCore(name: string): string {
  const lead = splitLeadingEmoji(name);
  return lead && /[\p{L}\p{N}]/u.test(lead.rest) ? lead.rest : name;
}

/**
 * Same dish? Case, accents, plurals, punctuation and a leading emoji don't count ("almoço" =
 * "Almoços!", "Pizza (6)" = "🍕 Pizza (6)" — nobody types or dictates the emoji), but emoji-only
 * and non-Latin names still tell dishes apart — "🍕" is not "🎂".
 */
export function sameDish(a: string, b: string): boolean {
  const x = dishCore(a);
  const y = dishCore(b);
  return normalizeName(x) === normalizeName(y) && extras(x) === extras(y);
}

/**
 * The name to file under: an existing dish that is the same dish ("lunch" → "Lunch"), else the
 * cleaned name. Keeps "Lunch:" typed in lower case from creating a second, near-identical dish.
 */
export function canonicalDish(raw: string | null | undefined, existing: readonly string[]): string | null {
  const name = cleanSection(raw);
  if (!name) return null;
  return existing.find((e) => e === name) ?? existing.find((e) => sameDish(e, name)) ?? name;
}
