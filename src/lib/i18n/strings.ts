import { usableName } from "./plausible";

/** UI language (Andre, 2026-11-12: the whole app in English or Portuguese, one tap to switch). */
export type Lang = "en" | "pt";
export const LANG_COOKIE = "mrlist-lang";
export const VIEW_COOKIE = "mrlist-view";
export const TIPS_COOKIE = "mrlist-tips";
export type View = "aisle" | "dish";
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
  clearShort: { en: "Clear", pt: "Limpar" },
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
  itemOptionsFor: { en: "Options for {name}", pt: "Opções de {name}" },
  checkItem: { en: "Check {name}", pt: "Marcar {name}" },
  uncheckItem: { en: "Uncheck {name}", pt: "Desmarcar {name}" },
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
  edit: { en: "Edit", pt: "Editar" },
  save: { en: "Save", pt: "Guardar" },
  cancel: { en: "Cancel", pt: "Cancelar" },
  dish: { en: "Dish", pt: "Prato" },
  aisle: { en: "Aisle", pt: "Corredor" },
  noDish: { en: "No dish", pt: "Sem prato" },
  byAisle: { en: "By aisle", pt: "Por corredor" },
  byDish: { en: "By dish", pt: "Por prato" },
  viewHelp: {
    en: "Shopping? Use “By aisle”: everything in store order, each item tagged with its dish.",
    pt: "Às compras? Usa “Por corredor”: tudo pela ordem da loja, cada produto com o prato ao lado.",
  },
  viewHelpAisle: {
    en: "To add or remove a dish’s ingredients, tap “By dish”.",
    pt: "Para juntar ou tirar ingredientes de um prato, toca em “Por prato”.",
  },
  hideTip: { en: "Hide tip", pt: "Esconder dica" },
  // Dishes (2026-11-13)
  dishTip: {
    en: "Group ingredients by meal: tap “Dish”, or type “Lunch: cod, potatoes”.",
    pt: "Agrupa ingredientes por refeição: toca em “Prato” ou escreve “Almoço: bacalhau, batatas”.",
  },
  dishShort: { en: "Dish", pt: "Prato" },
  newDish: { en: "New dish", pt: "Novo prato" },
  dishName: { en: "Dish name", pt: "Nome do prato" },
  dishNamePlaceholder: { en: "e.g. Lasagne", pt: "ex. Lasanha" },
  icon: { en: "Icon", pt: "Ícone" },
  plainIcon: { en: "Plain (fork and knife)", pt: "Simples (talheres)" },
  ingredients: { en: "Ingredients", pt: "Ingredientes" },
  ingredientsPlaceholder: {
    en: "One per line or comma-separated\n200 g bacon, cream\n3 eggs",
    pt: "Um por linha ou separados por vírgulas\n200 g bacon, natas\n3 ovos",
  },
  ingredientOne: { en: "1 ingredient", pt: "1 ingrediente" },
  ingredientMany: { en: "{n} ingredients", pt: "{n} ingredientes" },
  fromRecipe: { en: "Start from a recipe", pt: "Começar de uma receita" },
  searchRecipes: { en: "Search recipes", pt: "Procurar receitas" },
  yourRecipes: { en: "Your recipes", pt: "As tuas receitas" },
  recipesOf: { en: "{name}’s recipes", pt: "Receitas de {name}" },
  noRecipeMatch: { en: "No recipe with that name", pt: "Nenhuma receita com esse nome" },
  fromRecipeChosen: { en: "From recipe", pt: "Da receita" },
  clearChoice: { en: "Clear", pt: "Limpar" },
  createDish: { en: "Create dish", pt: "Criar prato" },
  addToDish: { en: "Add to “{name}”", pt: "Juntar a “{name}”" },
  dishExistsWillAdd: {
    en: "Already on the list — ingredients go into “{name}”",
    pt: "Já existe — os ingredientes vão para “{name}”",
  },
  addIngredient: { en: "Add ingredient", pt: "Adicionar ingrediente" },
  addToDishPlaceholder: { en: "Add to {name}…", pt: "Juntar a {name}…" },
  addLoosePlaceholder: { en: "Add without a dish…", pt: "Juntar sem prato…" },
  noIngredients: { en: "No ingredients yet — add the first below.", pt: "Ainda sem ingredientes — junta o primeiro aqui em baixo." },
  remove: { en: "Remove", pt: "Remover" },
  removeItem: { en: "Remove {name}", pt: "Remover {name}" },
  removedItem: { en: "Removed “{name}”", pt: "Removeste “{name}”" },
  removedDish: { en: "Dish removed: “{name}”", pt: "Prato removido: “{name}”" },
  clearedDoneOne: { en: "Cleared 1 done item", pt: "Limpaste 1 feito" },
  clearedDone: { en: "Cleared {n} done items", pt: "Limpaste {n} feitos" },
  clearedShort: { en: "{n} done", pt: "{n} feitos" },
  // Several removals while the toast is up: one Undo puts them all back.
  removedTwo: { en: "Removed {a} and {b}", pt: "Removeste {a} e {b}" },
  removedMore: { en: "Removed {a} and {n} more", pt: "Removeste {a} e mais {n}" },
  undo: { en: "Undo", pt: "Desfazer" },
  undoAll: { en: "Undo all", pt: "Desfazer tudo" },
  dishGone: { en: "This dish was removed", pt: "Este prato foi removido" },
  recreate: { en: "Create again", pt: "Criar de novo" },
  itemGone: { en: "That item was already removed", pt: "Esse produto já tinha sido removido" },
  undoExpired: { en: "Too late to undo", pt: "Já não dá para desfazer" },
  dishOptions: { en: "Dish options", pt: "Opções do prato" },
  rename: { en: "Rename", pt: "Mudar o nome" },
  renameHint: { en: "Name and icon", pt: "Nome e ícone" },
  saveAsRecipe: { en: "Save as recipe", pt: "Guardar como receita" },
  saveAsRecipeHint: { en: "Keep these ingredients in Recipes", pt: "Guarda estes ingredientes nas Receitas" },
  updateRecipe: { en: "Update recipe", pt: "Atualizar a receita" },
  updateRecipeHint: { en: "Replace its ingredients with these", pt: "Troca os ingredientes dela por estes" },
  savedRecipe: { en: "Saved to Recipes", pt: "Guardada nas Receitas" },
  updatedRecipe: { en: "Recipe updated", pt: "Receita atualizada" },
  open: { en: "Open", pt: "Abrir" },
  removeDish: { en: "Remove dish", pt: "Remover prato" },
  removeDishHintOne: { en: "And its 1 ingredient — you can undo", pt: "E o único ingrediente — dá para desfazer" },
  removeDishHint: { en: "And its {n} ingredients — you can undo", pt: "E os {n} ingredientes — dá para desfazer" },
  canUndo: { en: "You can undo", pt: "Dá para desfazer" },
  dishExists: { en: "There’s already a dish with that name.", pt: "Já há um prato com esse nome." },
  couldNotSave: { en: "Couldn’t save — try again.", pt: "Não deu para guardar — tenta outra vez." },
  close: { en: "Close", pt: "Fechar" },
  back: { en: "Back", pt: "Voltar" },
  create: { en: "Create", pt: "Criar" },
  collapse: { en: "Collapse", pt: "Fechar" },
  expand: { en: "Expand", pt: "Abrir" },
  willAdd: { en: "Will add", pt: "Vai juntar" },
  // Recipes tab
  newShort: { en: "New", pt: "Nova" },
  noRecipes: { en: "No recipes yet", pt: "Ainda não há receitas" },
  noRecipesBody: {
    en: "Save a recipe once, then add all its ingredients to your list as a dish in one tap.",
    pt: "Guarda uma receita uma vez e depois junta-a à lista como prato num toque.",
  },
  addAsDish: { en: "Add as dish", pt: "Juntar como prato" },
  addAsDishFor: { en: "Add as dish: {name}", pt: "Juntar como prato: {name}" },
  onList: { en: "On list", pt: "Na lista" },
  openDishFor: { en: "On the list — open “{name}”", pt: "Na lista — abrir “{name}”" },
  addAgain: { en: "Add again (×2)", pt: "Juntar outra vez (×2)" },
  addedAsDish: { en: "“{name}” is on the list", pt: "“{name}” está na lista" },
  newRecipe: { en: "New recipe", pt: "Nova receita" },
  editRecipe: { en: "Edit recipe", pt: "Editar receita" },
  backToRecipes: { en: "Back to recipes", pt: "Voltar às receitas" },
  recipeName: { en: "Recipe name", pt: "Nome da receita" },
  recipeNamePlaceholder: { en: "Recipe name — e.g. Meatloaf", pt: "Nome da receita — ex. Rolo de carne" },
  addIngredients: { en: "Add ingredients", pt: "Adicionar ingredientes" },
  addIngredientsPlaceholder: {
    en: "Add ingredients — 2kg flour, 3 eggs, salt",
    pt: "Adicionar ingredientes — 2kg farinha, 3 ovos, sal",
  },
  ingredient: { en: "Ingredient", pt: "Ingrediente" },
  qtyShort: { en: "Qty", pt: "Qtd" },
  unit: { en: "Unit", pt: "Unidade" },
  giveRecipeName: { en: "Give the recipe a name.", pt: "Dá um nome à receita." },
  saving: { en: "Saving…", pt: "A guardar…" },
  saveChanges: { en: "Save changes", pt: "Guardar alterações" },
  createRecipe: { en: "Create recipe", pt: "Criar receita" },
  deleteRecipe: { en: "Delete recipe", pt: "Apagar receita" },
  // List menu leftovers
  lists: { en: "Lists", pt: "Listas" },
  listName: { en: "List name", pt: "Nome da lista" },
  createLink: { en: "Create link", pt: "Criar link" },
  revokeLinks: { en: "Revoke all links", pt: "Revogar todos os links" },
  myList: { en: "My list", pt: "A minha lista" },
  sharedBy: { en: "Shared by {name}", pt: "Partilhada por {name}" },
  // Join / link pages
  invitedToJoin: { en: "You’ve been invited to join", pt: "Foste convidado para a lista" },
  joinList: { en: "Join list", pt: "Entrar na lista" },
  joining: { en: "Joining…", pt: "A entrar…" },
  inviteInvalid: { en: "This invite is invalid or has expired.", pt: "Este convite já não é válido ou expirou." },
  guestLinkInvalid: {
    en: "This guest link is no longer valid or has expired.",
    pt: "Este link de convidado já não é válido ou expirou.",
  },
  linkUnavailable: { en: "Link unavailable", pt: "Link indisponível" },
  goToApp: { en: "Go to MrList", pt: "Ir para o MrList" },
  // Error screen
  errorTitle: { en: "Something went wrong", pt: "Algo correu mal" },
  errorBody: { en: "Your list is safe — try again.", pt: "A tua lista está a salvo — tenta outra vez." },
  tryAgain: { en: "Try again", pt: "Tentar outra vez" },
} as const;

export type StringKey = keyof typeof S;

export function t(lang: Lang, key: StringKey): string {
  return S[key][lang];
}

/** Fill "{name}"-style slots: fill(t(lang, "removedItem"), { name: "bacon" }). */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** "1 ingredient" / "3 ingredientes". */
export function ingredientCount(lang: Lang, n: number): string {
  return n === 1 ? t(lang, "ingredientOne") : fill(t(lang, "ingredientMany"), { n });
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

/**
 * The item name to show: its translation in the UI language, else what was typed. A saved
 * machine translation that looks like junk ("&Mudo") is skipped in favour of the typed name.
 */
export function itemNames(
  lang: Lang,
  row: { name: string; nameEn: string | null; namePt: string | null },
): { name: string; alt: string | null } {
  const ok = (s: string | null) => (usableName(row.name, s) ? s : null);
  const mine = ok(lang === "pt" ? row.namePt : row.nameEn) || row.name;
  const other = ok(lang === "pt" ? row.nameEn : row.namePt);
  const alt = other && other.toLowerCase() !== mine.toLowerCase() ? other : null;
  return { name: mine, alt };
}

/** The default list is created as "My list"; show it in the UI language. */
export function listLabel(lang: Lang, list: { name: string; isDefault: boolean }): string {
  return list.isDefault && list.name === "My list" ? t(lang, "myList") : list.name;
}

/** "Removed “x”", "Removed “x” and “y”", "Removed “z” and 2 more" (newest name first). */
export function removalMessage(lang: Lang, labels: { full: string; short: string }[]): string {
  const last = labels[labels.length - 1];
  if (labels.length === 1) return last.full;
  if (labels.length === 2) return fill(t(lang, "removedTwo"), { a: labels[0].short, b: last.short });
  return fill(t(lang, "removedMore"), { a: last.short, n: labels.length - 1 });
}
