import { normalizeName } from "./normalize";
import { categorize } from "./categorize";
import { FALLBACK_CATEGORY } from "../categories";

/**
 * Which shop an item is for (Andre, 2026-11-19): the supermarket, Leroy Merlin, or both — things
 * like duct tape or an extension cord that either shop sells. A "both" item is ONE row shown on
 * both tabs, so ticking it off in one ticks it off in the other.
 */
export type Store = "grocery" | "hardware" | "both";
/** The tab you are on: where an item goes when nothing says otherwise. */
export type StoreTab = "grocery" | "hardware";
export const STORES: readonly Store[] = ["grocery", "hardware", "both"];

/** Sold by both the supermarket and Leroy Merlin. */
const BOTH = [
  "duct tape", "fita adesiva", "fita americana", "fita cola", "sellotape", "tape", "super glue", "super cola", "cola tudo",
  "extension cord", "extension lead", "extension", "extensao", "power strip", "multi tomada", "multitomada", "tomada multipla",
  "battery", "pilha", "light bulb", "bulb", "lampada", "torch", "flashlight", "lanterna",
];

/** Leroy Merlin only: tools, DIY, electrics, plumbing, paint, garden, storage. */
const HARDWARE = [
  // tools and fixings
  "screw", "parafuso", "bucha", "wall plug", "drill", "berbequim", "broca", "hammer", "martelo", "screwdriver",
  "chave de fenda", "chave fenda", "chave inglesa", "pliers", "alicate", "serrote", "sandpaper", "papel de lixa",
  "spanner", "wrench", "tool", "ferramenta", "tape measure", "fita metrica", "nivel de bolha", "glue gun", "pistola de cola",
  "wood glue", "cola de madeira", "epoxy", "araldite", "wd 40", "wd40",
  // paint and repair
  "paint", "tinta", "primer", "primario", "paint brush", "pincel", "trincha", "paint roller", "rolo de pintura",
  "masking tape", "fita de pintor", "fita crepe", "filler", "massa de reparacao", "betume", "sealant", "silicone",
  "varnish", "verniz madeira", "white spirit", "diluente",
  // electrics and lighting
  "fita isoladora", "electrical tape", "cable tie", "abracadeira", "cable cover", "calha", "canaleta", "trunking",
  "socket", "tomada", "plug", "light switch", "interruptor", "disjuntor", "circuit breaker", "junction box",
  "caixa de derivacao", "surface box", "caixa de superficie", "fio eletrico", "cabo eletrico", "electrical cable",
  "wago", "ligador", "led strip", "fita led", "candeeiro", "lamp", "smoke detector", "detetor de fumo",
  // plumbing
  "torneira", "faucet", "siphon", "sifao", "hose", "mangueira", "teflon", "autoclismo", "toilet seat",
  "tampa de sanita", "chuveiro", "shower head",
  // garden
  "potting soil", "terra vegetal", "substrato", "adubo", "fertilizer", "fertilizante", "seed", "semente", "plant pot",
  "vaso", "floreira", "lawn", "relva", "weed killer", "herbicida", "rake", "ancinho", "shovel", "secateurs",
  "tesoura de poda", "watering can", "regador",
  // doors, walls, storage, building
  "hinge", "dobradica", "fechadura", "padlock", "cadeado", "puxador", "door stop", "batente", "shelf", "prateleira",
  "bracket", "suporte", "hook", "gancho", "curtain rod", "varao", "cement", "cimento", "plaster", "gesso", "tile",
  "azulejo", "wood", "madeira", "mdf", "pladur", "drywall", "grout", "insulation", "isolamento", "weather strip",
  "fita vedante", "vedante", "storage box", "caixa de arrumacao",
  // home kit
  "ladder", "escada", "fly screen", "mosquito net", "rede mosquiteira", "mosquiteira", "fly trap", "mata insetos",
  "dehumidifier", "desumidificador", "heater", "aquecedor", "ventoinha", "radiador", "office chair",
  "cadeira de escritorio", "cadeira escritorio", "mailbox", "caixa de correio",
];

type Kw = { kw: string; multi: boolean };
const prep = (list: string[]): Kw[] =>
  [...new Set(list.map(normalizeName).filter(Boolean))]
    .map((kw) => ({ kw, multi: kw.includes(" ") }))
    .sort((a, b) => b.kw.length - a.kw.length);
const HW = prep(HARDWARE);
const BO = prep(BOTH);

const has = (padded: string, tokens: Set<string>, k: Kw) => (k.multi ? padded.includes(` ${k.kw} `) : tokens.has(k.kw));

/**
 * The shop the name says, or null when the name doesn't tell (then the tab you typed it on
 * decides). Leroy words that name the thing ("masking tape", "fita metrica") win over the
 * shared ones ("tape"); food and cleaning words the aisle dictionary knows are the supermarket.
 */
export function storeOf(rawName: string, learned?: Map<string, Store>): Store | null {
  const norm = normalizeName(rawName);
  if (!norm) return null;
  const taught = learned?.get(norm);
  if (taught) return taught;
  const padded = ` ${norm} `;
  const tokens = new Set(norm.split(" "));
  for (const k of HW) if (k.multi && has(padded, tokens, k)) return "hardware";
  for (const k of BO) if (k.multi && has(padded, tokens, k)) return "both";
  for (const k of HW) if (!k.multi && has(padded, tokens, k)) return "hardware";
  for (const k of BO) if (!k.multi && has(padded, tokens, k)) return "both";
  return categorize(rawName) !== FALLBACK_CATEGORY ? "grocery" : null;
}

/** Where a new item goes: what you taught it, else what its name says, else the tab you're on. */
export function pickStore(rawName: string, here: StoreTab = "grocery", learned?: Map<string, Store>): Store {
  return storeOf(rawName, learned) ?? here;
}

/** Does this item show on that tab? "Both" items show on both. */
export const onTab = (store: Store | undefined, tab: StoreTab) => (store ?? "grocery") === tab || store === "both";

export const isStore = (s: unknown): s is Store => typeof s === "string" && (STORES as readonly string[]).includes(s);
