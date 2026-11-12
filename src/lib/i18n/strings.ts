/** UI language (Andre, 2026-11-12: the whole app in English or Portuguese, one tap to switch). */
export type Lang = "en" | "pt";
export const LANG_COOKIE = "mrlist-lang";
export const DEFAULT_LANG: Lang = "pt";

export function asLang(v: string | undefined | null): Lang {
  return v === "en" || v === "pt" ? v : DEFAULT_LANG;
}

const S = {
  addPlaceholder: { en: "Add item — milk, eggs…", pt: "Adicionar — leite, ovos…" },
  itemName: { en: "Item name", pt: "Nome do produto" },
  quantity: { en: "Quantity", pt: "Quantidade" },
  addByVoice: { en: "Add by voice", pt: "Adicionar por voz" },
  add: { en: "Add", pt: "Adicionar" },
  list: { en: "List", pt: "Lista" },
  recipes: { en: "Recipes", pt: "Receitas" },
  clearDone: { en: "Clear done", pt: "Limpar feitos" },
  left: { en: "left", pt: "por comprar" },
  allDone: { en: "all done ✓", pt: "tudo feito ✓" },
  emptyTitle: { en: "Nothing here yet", pt: "Ainda não há nada" },
  emptyBody: {
    en: "Type or speak above — “milk, 2kg potatoes, bananas” — and it sorts itself into the right aisles.",
    pt: "Escreve ou fala acima — “leite, 2kg batatas, bananas” — e arruma-se sozinho por secções.",
  },
  sectionTip: {
    en: "Tip: type “Lunch: cod, potatoes” to put items in a collapsible section.",
    pt: "Dica: escreve “Almoço: bacalhau, batatas” para pôr produtos numa secção que fecha.",
  },
  itemOptions: { en: "Item options", pt: "Opções" },
  delete: { en: "Delete", pt: "Apagar" },
  toggleTheme: { en: "Toggle theme", pt: "Mudar tema" },
  signOut: { en: "Sign out", pt: "Sair" },
  switchLang: { en: "Mudar para português", pt: "Switch to English" },
  newList: { en: "New list", pt: "Nova lista" },
  deleteList: { en: "Delete list", pt: "Apagar lista" },
  leaveList: { en: "Leave list", pt: "Sair da lista" },
  share: { en: "Share", pt: "Partilhar" },
  listNamePlaceholder: { en: "List name — e.g. Beach trip", pt: "Nome — ex. Ida à praia" },
  noExpiry: { en: "No expiry", pt: "Sem prazo" },
  oneDay: { en: "1 day", pt: "1 dia" },
  threeDays: { en: "3 days", pt: "3 dias" },
  oneWeek: { en: "1 week", pt: "1 semana" },
  inviteMember: { en: "Invite a member", pt: "Convidar membro" },
  inviteMemberBody: { en: "They sign in and can add + check items.", pt: "Entra com conta e pode adicionar e riscar." },
  guestLink: { en: "Guest link (no account)", pt: "Link de convidado (sem conta)" },
  guestLinkBody: { en: "Anyone with the link can view + add + check.", pt: "Quem tiver o link pode ver, adicionar e riscar." },
  copyLink: { en: "Copy link", pt: "Copiar link" },
  copiedLink: { en: "Copied link", pt: "Link copiado" },
} as const;

export type StringKey = keyof typeof S;

export function t(lang: Lang, key: StringKey): string {
  return S[key][lang];
}

const CATEGORY_LABELS: Record<string, { en: string; pt: string }> = {
  produce: { en: "Produce", pt: "Frutas e legumes" },
  dairy: { en: "Dairy", pt: "Laticínios e ovos" },
  meat_fish: { en: "Meat & Fish", pt: "Carne e peixe" },
  bakery: { en: "Bakery", pt: "Padaria" },
  frozen: { en: "Frozen", pt: "Congelados" },
  pantry: { en: "Pantry", pt: "Mercearia" },
  drinks: { en: "Drinks", pt: "Bebidas" },
  household: { en: "Household", pt: "Casa e limpeza" },
  other: { en: "Other", pt: "Outros" },
};

export function categoryLabel(lang: Lang, key: string, fallback: string): string {
  return CATEGORY_LABELS[key]?.[lang] ?? fallback;
}

/** The item name to show: its translation in the UI language, else what was typed. */
export function itemNames(
  lang: Lang,
  row: { name: string; nameEn: string | null; namePt: string | null },
): { name: string; alt: string | null } {
  const mine = (lang === "pt" ? row.namePt : row.nameEn) || row.name;
  const other = (lang === "pt" ? row.nameEn : row.namePt) || null;
  const alt = other && other.toLowerCase() !== mine.toLowerCase() ? other : null;
  return { name: mine, alt };
}
