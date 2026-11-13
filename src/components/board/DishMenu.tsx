"use client";

import { useState } from "react";
import { BookmarkPlus, ChevronRight, CircleAlert, Pencil, Trash2 } from "lucide-react";
import { dishView, type BoardDish, type DishGroup } from "@/lib/items/board";
import { autoEmoji, dishTitle } from "@/lib/items/dish-emoji";
import { cleanSection, sameDish } from "@/lib/items/sections";
import { normalizeName } from "@/lib/parse/normalize";
import { fill } from "@/lib/i18n/strings";
import { Sheet } from "../ui/Sheet";
import { useT } from "../LangProvider";
import { useBoard } from "./BoardProvider";
import { EmojiPicker } from "./EmojiPicker";

/**
 * A dish's ⋯ sheet: Rename (name + icon), Save as / Update recipe, Remove dish (Undo toast).
 * Looked up by id on every render so it always shows the live dish (renamed by someone else
 * included); mount with a fresh `key` per opening.
 */
export function DishMenu({
  dish: opened,
  open,
  onClose,
}: {
  /** The dish as it was when the menu opened (shown while the sheet slides away after Remove). */
  dish: BoardDish;
  open: boolean;
  onClose: () => void;
}) {
  const tr = useT();
  const { board, recipes, saveAsRecipe, removeDish } = useBoard();
  const [mode, setMode] = useState<"menu" | "rename">("menu");
  const dish: DishGroup = dishView(board).dishes.find((d) => d.id === opened.id) ?? { ...opened, items: [] };
  const hasRecipe = !!dish && recipes.some((r) => r.mine && normalizeName(r.name) === normalizeName(dish.name));
  const n = dish?.items.length ?? 0;

  return (
    <Sheet
      open={open && !!dish}
      onClose={onClose}
      title={dish ? dishTitle(dish) : tr("dishOptions")}
    >
      {dish && mode === "menu" && (
        <div className="flex flex-col gap-1 pt-1">
          <MenuRow
            icon={<Pencil className="size-5" />}
            label={tr("rename")}
            hint={tr("renameHint")}
            onClick={() => setMode("rename")}
            chevron
          />
          <MenuRow
            icon={<BookmarkPlus className="size-5" />}
            label={tr(hasRecipe ? "updateRecipe" : "saveAsRecipe")}
            hint={tr(hasRecipe ? "updateRecipeHint" : "saveAsRecipeHint")}
            disabled={n === 0}
            onClick={() => {
              saveAsRecipe(dish.id);
              onClose();
            }}
          />
          <div className="my-1 border-t border-hairline" />
          <MenuRow
            danger
            icon={<Trash2 className="size-5" />}
            label={tr("removeDish")}
            hint={n === 0 ? tr("canUndo") : n === 1 ? tr("removeDishHintOne") : fill(tr("removeDishHint"), { n })}
            onClick={() => {
              removeDish(dish.id);
              onClose();
            }}
          />
        </div>
      )}
      {dish && mode === "rename" && <RenameForm dish={dish} onBack={() => setMode("menu")} onDone={onClose} />}
    </Sheet>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onClick,
  danger = false,
  disabled = false,
  chevron = false,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-2 text-left transition-colors disabled:opacity-40 ${
        danger ? "text-over hover:bg-over/10" : "hover:bg-surface-2"
      }`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${danger ? "bg-over/10" : "bg-surface-2 text-muted"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className={`block text-xs ${danger ? "text-over/80" : "text-muted"}`}>{hint}</span>
      </span>
      {chevron && <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />}
    </button>
  );
}

function RenameForm({ dish, onBack, onDone }: { dish: DishGroup; onBack: () => void; onDone: () => void }) {
  const tr = useT();
  const { board, renameDish } = useBoard();
  const [name, setName] = useState(dish.name);
  // null (auto) stays "not picked", so the suggestion follows the new name.
  const [emoji, setEmoji] = useState<string | undefined>(dish.emoji === null ? undefined : dish.emoji);
  const clean = cleanSection(name);
  const clash = !!clean && board.dishes.some((d) => d.id !== dish.id && sameDish(d.name, clean));
  const unchanged = clean === dish.name && (emoji === undefined ? null : emoji) === dish.emoji;

  function save() {
    if (!clean || clash) return;
    if (!unchanged) renameDish(dish.id, clean, emoji === undefined ? null : emoji);
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <label htmlFor="rename-dish" className="px-1 text-xs font-semibold text-muted">
        {tr("dishName")}
      </label>
      <input
        id="rename-dish"
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        enterKeyHint="done"
        autoComplete="off"
        aria-invalid={clash || undefined}
        className="h-12 rounded-2xl border border-hairline bg-bg px-4 text-base font-medium text-fg outline-none focus:border-brand"
      />
      {clash && (
        <p className="flex items-center gap-1.5 px-1 text-sm font-medium text-over" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {tr("dishExists")}
        </p>
      )}
      <EmojiPicker value={emoji} suggested={autoEmoji(name)} onChange={setEmoji} />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border border-hairline text-sm font-semibold text-muted"
        >
          {tr("back")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!clean || clash}
          className="h-12 flex-[2] rounded-2xl bg-brand text-sm font-semibold text-on-brand disabled:opacity-40"
        >
          {tr("save")}
        </button>
      </div>
    </div>
  );
}
