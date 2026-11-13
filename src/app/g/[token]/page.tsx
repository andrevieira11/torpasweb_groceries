import type { Metadata } from "next";
import { resolveGuestToken } from "@/lib/queries/sharing";
import { getListItems } from "@/lib/queries/lists";
import { CATEGORIES } from "@/lib/categories";
import { GuestList } from "@/components/GuestList";
import { LinkInvalid } from "@/components/LinkInvalid";
import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";

export const metadata: Metadata = { title: "Shared list", robots: { index: false } };

export default async function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveGuestToken(token);
  if (!resolved) {
    const lang = await getLang();
    return <LinkInvalid lang={lang} message={t(lang, "guestLinkInvalid")} />;
  }

  const rows = await getListItems(resolved.list.id);
  const groups = CATEGORIES.map((c) => ({
    label: c.label,
    color: c.color,
    icon: c.icon,
    items: rows
      .filter((r) => r.categoryKey === c.key)
      .map((r) => ({ id: r.id, name: r.name, qty: r.qty, unit: r.unit, checked: r.checked })),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-12 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <GuestList token={token} listName={resolved.list.name} groups={groups} />
    </main>
  );
}
