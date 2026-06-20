/**
 * Name normalization — the identity basis for matching, merging, categorizing
 * and learning. Bilingual (PT + EN): accent-fold, lowercase, strip punctuation,
 * collapse whitespace, then a light singularizer so "bananas"/"banana" and
 * "ovos"/"ovo" collapse to one key.
 */

export function accentFold(s: string): string {
  // Decompose, then drop the combining diacritical marks (U+0300–U+036F).
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Plurals the generic rules get wrong. Keys are already accent-folded/lowercased.
const IRREGULAR_PLURALS: Record<string, string> = {
  potatoes: "potato",
  tomatoes: "tomato",
  loaves: "loaf",
  leaves: "leaf",
  knives: "knife",
  limoes: "limao", // PT limoes
  paes: "pao", // PT paes
  pasteis: "pastel", // PT pasteis
};

function singularizeToken(w: string): string {
  if (w.length <= 3) return w;
  if (IRREGULAR_PLURALS[w]) return IRREGULAR_PLURALS[w];
  if (/(ses|xes|zes|ches|shes)$/.test(w)) return w.slice(0, -2); // boxes -> box
  if (/oes$/.test(w)) return w.slice(0, -3) + "ao"; // PT meloes -> melao
  if (/aes$/.test(w)) return w.slice(0, -3) + "ao"; // PT caes -> cao
  if (/ies$/.test(w)) return w.slice(0, -3) + "y"; // EN berries -> berry
  if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1); // bananas -> banana
  return w;
}

/** Full normalized identity key for a free-text item name. */
export function normalizeName(raw: string): string {
  const cleaned = accentFold(raw.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.split(" ").map(singularizeToken).join(" ");
}

/** Light cleanup for the *display* name: trim, collapse spaces, keep casing. */
export function cleanDisplayName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
