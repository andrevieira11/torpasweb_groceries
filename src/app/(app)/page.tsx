import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import {
  ensureDishRows,
  getActiveList,
  getListDishes,
  getListItems,
  getListPeople,
  getUserLists,
} from "@/lib/queries/lists";
import { getActiveShareTokens } from "@/lib/queries/sharing";
import { getRecipesWithLines } from "@/lib/queries/recipes";
import { AddBar } from "@/components/AddBar";
import { ClearCheckedButton } from "@/components/ClearCheckedButton";
import { ListMenu } from "@/components/ListMenu";
import { BoardProvider } from "@/components/board/BoardProvider";
import { ListBoard } from "@/components/board/ListBoard";
import { getLang } from "@/lib/i18n/server";
import { itemNames, listLabel, TIPS_COOKIE, VIEW_COOKIE, type View } from "@/lib/i18n/strings";
import { fillMissingTranslations } from "@/lib/i18n/backfill";
import type { Board } from "@/lib/items/board";

export default async function ListPage() {
  const session = await requireSession();
  const active = await getActiveList(session.user.id);
  const isOwner = active.ownerId === session.user.id;

  const lang = await getLang();
  const jar = await cookies();
  const view: View = jar.get(VIEW_COOKIE)?.value === "dish" ? "dish" : "aisle";
  const tips = jar.get(TIPS_COOKIE)?.value !== "off";
  const [userLists, rawRows, tokens, rawDishes, people] = await Promise.all([
    getUserLists(session.user.id),
    getListItems(active.id),
    isOwner
      ? getActiveShareTokens(active.id)
      : Promise.resolve({} as { guest?: string; member_invite?: string }),
    getListDishes(active.id),
    getListPeople(active),
  ]);
  // Everyone on the list can start a dish from anyone's recipes (read-only for the others).
  const recipes = await getRecipesWithLines(people.map((p) => p.id));

  const rows = await fillMissingTranslations(rawRows);
  const healed = await ensureDishRows(
    active.id,
    rows.map((r) => r.section),
    rawDishes.map((d) => d.name),
  );
  const dishes = healed ? await getListDishes(active.id) : rawDishes;

  // One flat model for the client; "By aisle" and "By dish" are derived from it there, so
  // switching views and every dish edit are instant (see components/board).
  const board: Board = {
    items: rows.map((r) => ({
      id: r.id,
      ...itemNames(lang, r),
      normalizedName: r.normalizedName,
      dish: r.section,
      qty: r.qty,
      unit: r.unit,
      categoryKey: r.categoryKey,
      checked: r.checked,
    })),
    dishes: dishes.map((d) => ({ id: d.id, name: d.name, emoji: d.emoji })),
  };

  return (
    <BoardProvider
      key={active.id}
      listId={active.id}
      listOwnerId={active.ownerId}
      board={board}
      recipes={recipes.map((r) => ({ ...r, mine: r.ownerId === session.user.id }))}
      initialView={view}
      initialTips={tips}
    >
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <ListMenu
            active={{
              id: active.id,
              name: listLabel(lang, active),
              isDefault: active.isDefault,
              expiresAt: active.expiresAt ? active.expiresAt.toISOString() : null,
              role: isOwner ? "owner" : "member",
              ownerName: isOwner ? null : (userLists.find((l) => l.id === active.id)?.ownerName ?? null),
            }}
            lists={userLists.map((l) => ({
              id: l.id,
              name: listLabel(lang, l),
              isDefault: l.isDefault,
              expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
              ownerName: l.ownerName,
            }))}
            tokens={tokens}
          />
          <ClearCheckedButton />
        </div>

        <AddBar />

        <ListBoard />
      </section>
    </BoardProvider>
  );
}
