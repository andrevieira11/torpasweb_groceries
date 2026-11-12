import { ShoppingBasket } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getActiveList, getListItems, getUserLists } from "@/lib/queries/lists";
import { getActiveShareTokens } from "@/lib/queries/sharing";
import { CATEGORIES } from "@/lib/categories";
import { AddBar } from "@/components/AddBar";
import { CategoryGroup } from "@/components/CategoryGroup";
import { SectionGroup } from "@/components/SectionGroup";
import { ClearCheckedButton } from "@/components/ClearCheckedButton";
import { ListMenu } from "@/components/ListMenu";

export default async function ListPage() {
  const session = await requireSession();
  const active = await getActiveList(session.user.id);
  const isOwner = active.ownerId === session.user.id;

  const [userLists, rows, tokens] = await Promise.all([
    getUserLists(session.user.id),
    getListItems(active.id),
    isOwner
      ? getActiveShareTokens(active.id)
      : Promise.resolve({} as { guest?: string; member_invite?: string }),
  ]);

  const toView = (r: (typeof rows)[number]) => ({
    id: r.id,
    name: r.name,
    qty: r.qty,
    unit: r.unit,
    categoryKey: r.categoryKey,
    checked: r.checked,
  });
  const byCategory = (list: typeof rows) =>
    CATEGORIES.map((category) => ({
      category,
      items: list.filter((r) => r.categoryKey === category.key).map(toView),
    })).filter((g) => g.items.length > 0);

  // Items without a section first (as before), then one collapsible card per section,
  // in the order each section was first used.
  const groups = byCategory(rows.filter((r) => !r.section));
  const sectionNames: string[] = [];
  for (const r of [...rows].sort((a, b) => +a.createdAt - +b.createdAt)) {
    if (r.section && !sectionNames.includes(r.section)) sectionNames.push(r.section);
  }
  const sections = sectionNames.map((name) => ({
    name,
    categories: byCategory(rows.filter((r) => r.section === name)).map(({ category, items }) => ({
      key: category.key,
      label: category.label,
      color: category.color,
      icon: category.icon,
      items,
    })),
  }));

  const checkedCount = rows.filter((r) => r.checked).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <ListMenu
          active={{
            id: active.id,
            name: active.name,
            isDefault: active.isDefault,
            expiresAt: active.expiresAt ? active.expiresAt.toISOString() : null,
            role: isOwner ? "owner" : "member",
          }}
          lists={userLists.map((l) => ({
            id: l.id,
            name: l.name,
            isDefault: l.isDefault,
            expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
          }))}
          tokens={tokens}
        />
        {checkedCount > 0 && <ClearCheckedButton listId={active.id} count={checkedCount} />}
      </div>

      <AddBar listId={active.id} />

      {groups.length === 0 && sections.length === 0 ? (
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
          {sections.map((sec) => (
            <SectionGroup key={sec.name} listId={active.id} name={sec.name} categories={sec.categories} />
          ))}
          {sections.length === 0 && (
            <p className="px-2 text-xs text-muted">
              Tip: type &ldquo;Lunch: cod, potatoes&rdquo; to put items in a collapsible section.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
