import { normalizeName } from "./normalize";
import { DICT_SINGLE, DICT_MULTI } from "./dictionary";
import { FALLBACK_CATEGORY } from "../categories";

/**
 * Decide an item's category from its name. A learned rule (the user's own
 * categorize_rules, keyed by normalized name) always wins over the dictionary.
 * Pure: the caller supplies the learned map so this stays trivially testable.
 */
export function categorize(rawName: string, learned?: Map<string, string>): string {
  const norm = normalizeName(rawName);
  if (!norm) return FALLBACK_CATEGORY;

  // 1) learned override (user taught us)
  const taught = learned?.get(norm);
  if (taught) return taught;

  // 2) exact single-word match
  const exact = DICT_SINGLE.get(norm);
  if (exact) return exact;

  // 3) multiword keyword present as whole words (longest first)
  const padded = ` ${norm} `;
  for (const { kw, cat } of DICT_MULTI) {
    if (padded.includes(` ${kw} `)) return cat;
  }

  // 4) any single token matches a keyword
  for (const tok of norm.split(" ")) {
    const c = DICT_SINGLE.get(tok);
    if (c) return c;
  }

  return FALLBACK_CATEGORY;
}
