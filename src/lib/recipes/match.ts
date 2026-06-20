import { normalizeName } from "@/lib/parse/normalize";

export type RecipeRef = { id: string; name: string; normalizedName: string };

const MIN_RATIO = 0.85;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

/**
 * Fuzzy-match a free-text phrase to a saved recipe. Exact normalized match wins;
 * otherwise the closest recipe above a high similarity threshold (so "add
 * meatloaf" / "meat loaf" hit "Meatloaf" but "milk" matches nothing). Returns
 * null when nothing is confident enough.
 */
export function matchRecipe(query: string, recipes: RecipeRef[]): RecipeRef | null {
  const q = normalizeName(query);
  if (q.length < 3 || recipes.length === 0) return null;

  for (const r of recipes) {
    if (r.normalizedName === q) return r;
  }

  let best: RecipeRef | null = null;
  let bestScore = 0;
  for (const r of recipes) {
    const score = ratio(q, r.normalizedName);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= MIN_RATIO ? best : null;
}
