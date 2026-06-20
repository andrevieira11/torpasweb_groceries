import { accentFold, cleanDisplayName, normalizeName } from "./normalize";
import { getUnitMeta } from "./units";

export type ParsedItem = {
  name: string; // display name, as cleaned
  normalizedName: string; // identity key
  qty: number | null;
  unit: string | null; // canonical unit, or null
  raw: string; // the original segment
};

// Leading command verbs to drop ("add milk", "adiciona leite"). Longest first.
const COMMAND_PREFIXES = [
  "preciso de", "please add", "adicionar", "acrescenta", "adiciona", "comprar",
  "preciso", "compra", "quero", "poe", "add", "buy", "get", "need", "put",
].sort((a, b) => b.length - a.length);

function toNum(s: string): number {
  return parseFloat(s.replace(",", "."));
}

/** Recognize a standalone quantity token, e.g. 2kg, 500g, x3, 3x, 1/2, 2, meio. */
function matchQtyToken(token: string): { qty: number; unit: string | null } | null {
  const t = token.toLowerCase();
  let m = /^(?:x|×)(\d+(?:[.,]\d+)?)$/.exec(t); // x3
  if (m) return { qty: toNum(m[1]), unit: "x" };
  m = /^(\d+(?:[.,]\d+)?)(?:x|×)$/.exec(t); // 3x
  if (m) return { qty: toNum(m[1]), unit: "x" };
  m = /^(\d+(?:[.,]\d+)?)([a-zµ]+)$/.exec(t); // 2kg, 500g
  if (m) {
    const meta = getUnitMeta(m[2]);
    return meta ? { qty: toNum(m[1]), unit: meta.canonical } : null;
  }
  m = /^(\d+)\/(\d+)$/.exec(t); // 1/2
  if (m) {
    const d = Number(m[2]);
    if (d) return { qty: Number(m[1]) / d, unit: null };
  }
  if (/^(\d+(?:[.,]\d+)?)$/.test(t)) return { qty: toNum(t), unit: null }; // 2
  if (t === "meio" || t === "meia" || t === "half") return { qty: 0.5, unit: null };
  return null;
}

function parseSegment(raw: string): ParsedItem | null {
  const seg = cleanDisplayName(raw);
  if (!seg) return null;

  const tokens = seg.split(" ");
  let qty: number | null = null;
  let unit: string | null = null;
  let qtyIdx = -1;
  let consumeNextUnit = false;

  for (let i = 0; i < tokens.length; i++) {
    const m = matchQtyToken(tokens[i]);
    if (m) {
      qty = m.qty;
      unit = m.unit;
      qtyIdx = i;
      if (!unit && i + 1 < tokens.length) {
        const nextMeta = getUnitMeta(tokens[i + 1]); // "2 kg", "2 L"
        if (nextMeta) {
          unit = nextMeta.canonical;
          consumeNextUnit = true;
        }
      }
      break;
    }
  }

  const nameTokens =
    qtyIdx < 0
      ? tokens
      : tokens.filter(
          (_, i) => i !== qtyIdx && !(consumeNextUnit && i === qtyIdx + 1),
        );

  const name = cleanDisplayName(nameTokens.join(" "));
  if (!name) return null; // a bare quantity with no item — skip

  return { name, normalizedName: normalizeName(name), qty, unit, raw: seg };
}

export function stripCommandPrefix(input: string): string {
  const s = input.trim();
  const folded = accentFold(s.toLowerCase());
  for (const p of COMMAND_PREFIXES) {
    if (folded.startsWith(p + " ")) return s.slice(p.length).trimStart();
  }
  return s;
}

/**
 * Parse a free-text add ("milk, 2kg potatoes, bananas e 1 pão") into items.
 * Splits on commas / newlines / semicolons and the conjunctions "e" / "and".
 */
export function parseInput(input: string): ParsedItem[] {
  // Protect PT decimal commas (0,5 -> 0.5) so they survive comma-splitting.
  const stripped = stripCommandPrefix(input).replace(/(\d),(\d)/g, "$1.$2");
  const segments = stripped
    .replace(/\s+&\s+|\s+\+\s+/g, ", ")
    .split(/[,\n;]+|\s+\be\b\s+|\s+\band\b\s+/i);

  const items: ParsedItem[] = [];
  for (const seg of segments) {
    const parsed = parseSegment(seg);
    if (parsed) items.push(parsed);
  }
  return items;
}
