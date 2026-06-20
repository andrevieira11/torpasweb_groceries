"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { parseInput, categorize } from "@/lib/parse";
import { CATEGORIES } from "@/lib/categories";
import { createRecipe, deleteRecipe, updateRecipe } from "@/lib/actions/recipes";

type Ingredient = {
  name: string;
  qty: number | null;
  unit: string | null;
  categoryKey: string;
};
type Row = Ingredient & { key: string };
type Initial = { id: string; name: string; ingredients: Ingredient[] };

export function RecipeForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [rows, setRows] = useState<Row[]>(
    () => (initial?.ingredients ?? []).map((g, i) => ({ key: `init-${i}`, ...g })),
  );
  const [quick, setQuick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addFromQuick() {
    const parsed = parseInput(quick);
    if (parsed.length === 0) return;
    setRows((prev) => [
      ...prev,
      ...parsed.map((p) => ({
        key: crypto.randomUUID(),
        name: p.name,
        qty: p.qty,
        unit: p.unit,
        categoryKey: categorize(p.name),
      })),
    ]);
    setQuick("");
  }

  function patch(key: string, next: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Give the recipe a name.");
      return;
    }
    const ingredients = rows
      .map((r) => ({
        name: r.name.trim(),
        qty: r.qty,
        unit: r.unit?.trim() || null,
        categoryKey: r.categoryKey,
      }))
      .filter((r) => r.name.length > 0);

    startTransition(async () => {
      try {
        if (initial) await updateRecipe({ id: initial.id, name: name.trim(), ingredients });
        else await createRecipe({ name: name.trim(), ingredients });
        router.push("/recipes");
        router.refresh();
      } catch {
        setError("Could not save. Try again.");
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    startTransition(async () => {
      await deleteRecipe({ id: initial.id });
      router.push("/recipes");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/recipes")}
          aria-label="Back to recipes"
          className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">
          {initial ? "Edit recipe" : "New recipe"}
        </h1>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Recipe name — e.g. Meatloaf"
        aria-label="Recipe name"
        className="h-12 rounded-2xl border border-hairline bg-surface px-4 text-base font-medium text-fg outline-none focus:border-brand"
      />

      <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5">
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromQuick();
            }
          }}
          placeholder="Add ingredients — 2kg flour, 3 eggs, salt"
          aria-label="Add ingredients"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-fg outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={addFromQuick}
          aria-label="Add ingredients"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg transition-colors hover:bg-hairline"
        >
          <Plus className="size-5" strokeWidth={2.6} />
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={row.name}
                  onChange={(e) => patch(row.key, { name: e.target.value })}
                  placeholder="Ingredient"
                  aria-label="Ingredient name"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-fg outline-none"
                />
                <button
                  type="button"
                  onClick={() => remove(row.key)}
                  aria-label={`Remove ${row.name || "ingredient"}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-over/10 hover:text-over"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={row.qty ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    patch(row.key, { qty: v === "" ? null : Number(v) });
                  }}
                  placeholder="Qty"
                  aria-label="Quantity"
                  className="w-16 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-brand"
                />
                <input
                  value={row.unit ?? ""}
                  onChange={(e) => patch(row.key, { unit: e.target.value || null })}
                  placeholder="Unit"
                  aria-label="Unit"
                  className="w-20 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-brand"
                />
                <select
                  value={row.categoryKey}
                  onChange={(e) => patch(row.key, { categoryKey: e.target.value })}
                  aria-label="Category"
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-brand"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-over">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-12 flex-1 rounded-2xl bg-brand text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : initial ? "Save changes" : "Create recipe"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Delete recipe"
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-hairline text-over transition-colors hover:bg-over/10 disabled:opacity-60"
          >
            <Trash2 className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
}
