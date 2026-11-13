import { normalizeName } from "@/lib/parse/normalize";
import { splitLeadingEmoji } from "./sections";

/** The quick-pick palette for a dish's icon (one shape per dish — readable without colour). */
export const DISH_EMOJIS = [
  "🍝", "🍲", "🥗", "🍕", "🍔", "🌮", "🍛", "🍣",
  "🐟", "🍗", "🥩", "🥘", "🍳", "🥞", "🍰", "🧀", "🎉",
] as const;
export type DishEmoji = (typeof DISH_EMOJIS)[number];

// Keywords (PT + EN) → emoji. Normalized like item names, so plurals/accents don't matter.
const KEYWORDS: [DishEmoji, string[]][] = [
  ["🍳", ["pequeno almoço", "breakfast", "brunch", "omelete", "omelette", "ovos mexidos", "scrambled eggs"]],
  ["🍝", ["lasanha", "lasagna", "lasagne", "esparguete", "spaghetti", "massa", "pasta", "carbonara", "bolonhesa", "bolognese", "noodles", "macarrão", "ravioli", "tagliatelle"]],
  ["🍲", ["sopa", "soup", "caldo", "canja", "stew", "guisado", "cozido", "chili", "ramen"]],
  ["🥗", ["salada", "salad", "bowl"]],
  ["🍕", ["pizza"]],
  ["🍔", ["hambúrguer", "hamburguer", "hamburger", "burger", "prego", "bifana", "sandes", "sandwich", "tosta"]],
  ["🌮", ["taco", "burrito", "fajita", "nachos", "quesadilla", "mexicano", "mexican"]],
  ["🍛", ["caril", "curry", "risotto", "arroz", "rice", "biryani", "tikka"]],
  ["🍣", ["sushi", "sashimi", "poke"]],
  ["🐟", ["bacalhau", "peixe", "fish", "salmão", "salmon", "atum", "tuna", "dourada", "robalo", "sardinha", "polvo", "marisco", "seafood", "camarão", "shrimp"]],
  ["🍗", ["frango", "chicken", "galinha", "peru", "turkey", "asa", "wings"]],
  ["🥩", ["bife", "steak", "carne", "meat", "picanha", "entrecosto", "ribs", "porco", "pork", "vitela", "beef", "churrasco", "barbecue", "bbq", "rolo de carne", "meatloaf"]],
  ["🥘", ["paella", "paelha", "feijoada", "cataplana", "tagine", "chanfana"]],
  ["🥞", ["panqueca", "pancake", "crepe", "waffle"]],
  ["🍰", ["bolo", "cake", "sobremesa", "dessert", "tarte", "pie", "doce", "mousse", "pudim", "cheesecake"]],
  ["🧀", ["mac and cheese", "mac", "cheese", "queijo", "queijos", "fondue", "raclette", "tábua de queijos"]],
  ["🎉", ["festa", "party", "aniversário", "birthday", "anos", "jantar de amigos", "natal", "christmas", "jantarada"]],
];

const PHRASES: { kw: string; emoji: DishEmoji }[] = [];
const WORDS = new Map<string, DishEmoji>();
for (const [emoji, kws] of KEYWORDS) {
  for (const k of kws) {
    const n = normalizeName(k);
    if (n.includes(" ")) PHRASES.push({ kw: n, emoji });
    else if (!WORDS.has(n)) WORDS.set(n, emoji);
  }
}
PHRASES.sort((a, b) => b.kw.length - a.kw.length);

/**
 * A fitting emoji for a dish name, or null. Multi-word keywords first ("pequeno almoço"),
 * then the first word that is a keyword ("Salada de frango" → 🥗, not 🍗).
 */
export function suggestEmoji(name: string): DishEmoji | null {
  const norm = normalizeName(name);
  if (!norm) return null;
  const padded = ` ${norm} `;
  for (const { kw, emoji } of PHRASES) if (padded.includes(` ${kw} `)) return emoji;
  for (const word of norm.split(" ")) {
    const hit = WORDS.get(word);
    if (hit) return hit;
  }
  return null;
}

/** The icon a dish gets when none was picked: the emoji its name starts with, else a suggestion. */
export function autoEmoji(name: string): string | null {
  const lead = splitLeadingEmoji(name);
  if (lead) return lead.rest ? lead.emoji : null;
  return suggestEmoji(name);
}

const bare = (e: string) => e.replace(/\u{FE0F}/gu, "");

/**
 * How to draw a dish: the icon (null = the plain fork and knife) and the name next to it — one
 * helper for the card, the ⋯ sheet, the aisle tag and the move-to-dish chips, so a name typed as
 * "🍟 Fish & chips" shows its own 🍟 once, never 🐟 + "🍟 Fish & chips".
 * - emoji null (auto): the emoji the name starts with becomes the icon and leaves the label;
 *   otherwise the suggestion from the name ("Lasanha" → 🍝).
 * - emoji "": no icon, the name as typed.
 * - a picked emoji: that icon; the name loses its leading emoji only when it is the same one.
 * An emoji-only name ("🍕") stays the label, with the plain icon.
 */
export function dishDisplay(dish: { name: string; emoji: string | null }): { icon: string | null; label: string } {
  const lead = splitLeadingEmoji(dish.name);
  if (dish.emoji === null) {
    if (lead) return lead.rest ? { icon: lead.emoji, label: lead.rest } : { icon: null, label: dish.name };
    return { icon: suggestEmoji(dish.name), label: dish.name };
  }
  if (!dish.emoji) return { icon: null, label: dish.name };
  if (lead?.rest && bare(lead.emoji) === bare(dish.emoji)) return { icon: dish.emoji, label: lead.rest };
  return { icon: dish.emoji, label: dish.name };
}

/** "🍕 Pizza (6)" as one line of text (sheet titles): the icon once, then the label. */
export function dishTitle(dish: { name: string; emoji: string | null }): string {
  const { icon, label } = dishDisplay(dish);
  return icon ? `${icon} ${label}` : label;
}

export function isDishEmoji(v: string): v is DishEmoji {
  return (DISH_EMOJIS as readonly string[]).includes(v);
}
