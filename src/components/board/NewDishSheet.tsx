"use client";

import { useRef, useState } from "react";
import { Check, ChefHat, Info, Search, X } from "lucide-react";
import { findDish, MAX_ADD } from "@/lib/items/board";
import { autoEmoji } from "@/lib/items/dish-emoji";
import { cleanSection } from "@/lib/items/sections";
import { normalizeName } from "@/lib/parse/normalize";
import { parseInput } from "@/lib/parse/parseInput";
import { displayQuantity } from "@/lib/quantity";
import { fill, ingredientCount } from "@/lib/i18n/strings";
import { Sheet } from "../ui/Sheet";
import { useLang, useT } from "../LangProvider";
import { useBoard, type RecipeLite } from "./BoardProvider";
import { EmojiPicker } from "./EmojiPicker";

const SHOW_RECIPES = 5;

/**
 * "＋ New dish": name (+ one-tap icon, suggested from the name), ingredients one per line or
 * comma-separated with a live preview, or start from a saved recipe — yours first, then the
 * ones of the other people on this list. Mount with a fresh `key` per opening so every new
 * dish starts blank.
 */
export function NewDishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useT();
  const lang = useLang();
  const { board, recipes, createDish } = useBoard();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>(undefined);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<RecipeLite | null>(null);
  const autoName = useRef<string | null>(null); // the name a recipe filled in (replaceable)
  const ingredientsRef = useRef<HTMLTextAreaElement>(null);

  const clean = cleanSection(name);
  const existing = clean ? findDish(board.dishes, clean) : undefined;
  const parsed = parseInput(text).slice(0, MAX_ADD);

  const q = normalizeName(query);
  const ordered = [...recipes.filter((r) => r.mine), ...recipes.filter((r) => !r.mine)];
  const matches = (q ? ordered.filter((r) => normalizeName(r.name).includes(q)) : ordered).slice(0, SHOW_RECIPES);
  const anyOthers = recipes.some((r) => !r.mine);
  // Group headers: "Your recipes", then "André's recipes" (only when someone else's are listed).
  const groups: { title: string | null; items: RecipeLite[] }[] = [];
  for (const r of matches) {
    const title = r.mine ? (anyOthers ? tr("yourRecipes") : null) : fill(tr("recipesOf"), { name: r.ownerName });
    const g = groups[groups.length - 1];
    if (g && g.title === title) g.items.push(r);
    else groups.push({ title, items: [r] });
  }

  function pick(r: RecipeLite) {
    if (recipe?.id === r.id) {
      setRecipe(null);
      return;
    }
    setRecipe(r);
    setText(r.lines.join("\n"));
    if (!name.trim() || name === autoName.current) {
      setName(r.name);
      autoName.current = r.name;
    }
  }

  function create() {
    if (!clean) return;
    createDish({ name: clean, emoji: emoji === undefined ? null : emoji, text });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tr("newDish")}
      footer={
        <button
          type="button"
          onClick={create}
          disabled={!clean}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-3 text-base font-semibold text-on-brand transition-opacity disabled:opacity-40"
        >
          <span className="truncate">{existing ? fill(tr("addToDish"), { name: existing.name }) : tr("createDish")}</span>
          {parsed.length > 0 && (
            <span className="shrink-0 rounded-full bg-on-brand/15 px-2 py-0.5 text-xs">{ingredientCount(lang, parsed.length)}</span>
          )}
        </button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-dish-name" className="px-1 text-xs font-semibold text-muted">
            {tr("dishName")}
          </label>
          <input
            id="new-dish-name"
            autoFocus
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ingredientsRef.current?.focus();
              }
            }}
            enterKeyHint="next"
            autoComplete="off"
            placeholder={tr("dishNamePlaceholder")}
            aria-describedby={existing ? "new-dish-exists" : undefined}
            className="h-12 rounded-2xl border border-hairline bg-bg px-4 text-base font-medium text-fg outline-none focus:border-brand"
          />
          {existing ? (
            // Typing an existing dish's name adds to it — say so right here, and don't offer an
            // icon that would be ignored.
            <p id="new-dish-exists" className="flex items-start gap-1.5 px-1 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {fill(tr("dishExistsWillAdd"), { name: existing.name })}
            </p>
          ) : (
            <EmojiPicker value={emoji} suggested={autoEmoji(name)} onChange={setEmoji} />
          )}
        </div>

        {recipes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-xs font-semibold text-muted">{tr("fromRecipe")}</span>
            {recipes.length > SHOW_RECIPES && (
              <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-bg px-3 focus-within:border-brand">
                <Search className="size-4 shrink-0 text-muted" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder={tr("searchRecipes")}
                  aria-label={tr("searchRecipes")}
                  className="h-11 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-muted"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {groups.map((g) => (
                <div key={g.title ?? "mine"} className="flex flex-col gap-1.5">
                  {g.title && <span className="px-1 pt-0.5 text-xs font-medium text-muted">{g.title}</span>}
                  {g.items.map((r) => {
                    const on = recipe?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => pick(r)}
                        aria-pressed={on}
                        className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-left transition-colors ${
                          on ? "border-brand bg-brand/10" : "border-hairline bg-bg hover:bg-surface-2"
                        }`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                          {on ? <Check className="size-4 text-brand" strokeWidth={2.8} /> : <ChefHat className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 break-words text-[15px] font-medium leading-snug">{r.name}</span>
                          <span className="text-xs text-muted">
                            {on ? `${tr("fromRecipeChosen")} · ` : ""}
                            {ingredientCount(lang, r.lines.length)}
                          </span>
                        </span>
                        {on && <X className="size-4 shrink-0 text-muted" aria-label={tr("clearChoice")} />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {matches.length === 0 && <p className="px-1 text-sm text-muted">{tr("noRecipeMatch")}</p>}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-dish-ingredients" className="px-1 text-xs font-semibold text-muted">
            {tr("ingredients")}
          </label>
          <textarea
            id="new-dish-ingredients"
            ref={ingredientsRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={tr("ingredientsPlaceholder")}
            className="min-h-28 resize-none rounded-2xl border border-hairline bg-bg px-4 py-3 text-fg outline-none placeholder:text-muted focus:border-brand"
          />
          {parsed.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 px-0.5" aria-label={tr("willAdd")}>
              {parsed.map((p, i) => {
                const qty = displayQuantity(p.qty, p.unit);
                return (
                  <li
                    key={`${i}-${p.normalizedName}`}
                    className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium"
                  >
                    {qty && <span className="text-muted">{qty}</span>}
                    {p.name}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
