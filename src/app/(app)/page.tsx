import { ShoppingBasket } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getOrCreateDefaultList, getListItems } from "@/lib/queries/lists";
import { CATEGORIES } from "@/lib/categories";
import { AddBar } from "@/components/AddBar";
import { CategoryGroup } from "@/components/CategoryGroup";
import { ClearCheckedButton } from "@/components/ClearCheckedButton";

export default async function ListPage() {
  const session = await requireSession();
  const list = await getOrCreateDefaultList(session.user.id);
  const rows = await getListItems(list.id);

  const groups = CATEGORIES.map((category) => ({
    category,
    items: rows
      .filter((r) => r.categoryKey === category.key)
      .map((r) => ({
        id: r.id,
        name: r.name,
        qty: r.qty,
        unit: r.unit,
        categoryKey: r.categoryKey,
        checked: r.checked,
      })),
  })).filter((g) => g.items.length > 0);

  const checkedCount = rows.filter((r) => r.checked).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
        {checkedCount > 0 && <ClearCheckedButton listId={list.id} count={checkedCount} />}
      </div>

      <AddBar listId={list.id} />

      {groups.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
            <ShoppingBasket className="size-7" />
          </div>
          <p className="text-base font-medium">Nothing here yet</p>
          <p className="max-w-[18rem] text-sm text-muted">
            Type or speak above — &ldquo;milk, 2kg potatoes, bananas&rdquo; — and it
            sorts itself into the right aisles.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(({ category, items }) => (
            <CategoryGroup
              key={category.key}
              label={category.label}
              color={category.color}
              icon={category.icon}
              items={items}
            />
          ))}
        </div>
      )}
    </section>
  );
}
