import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { translateName } from "./translate";

/**
 * Items added before translations existed (or while the translator was down)
 * get their EN/PT names the first time a list is shown. Capped so a page never
 * waits long: at most 25 per render, whatever fails just shows the typed name.
 */
export async function fillMissingTranslations<
  T extends { id: string; name: string; nameEn: string | null; namePt: string | null },
>(rows: T[]): Promise<T[]> {
  const missing = rows.filter((r) => !r.nameEn || !r.namePt).slice(0, 25);
  if (missing.length === 0) return rows;
  const done = new Map<string, { en: string; pt: string }>();
  await Promise.all(
    missing.map(async (r) => {
      const n = await translateName(r.name);
      done.set(r.id, n);
      try {
        await db.update(items).set({ nameEn: n.en, namePt: n.pt }).where(eq(items.id, r.id));
      } catch {}
    }),
  );
  return rows.map((r) => {
    const n = done.get(r.id);
    return n ? { ...r, nameEn: n.en, namePt: n.pt } : r;
  });
}
