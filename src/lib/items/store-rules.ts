import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { storeRules } from "@/db/schema";
import { isStore, type Store } from "@/lib/parse/store";

/** The list owner's learned shops (normalized name → shop), from moving items between tabs. */
export async function learnedStores(ownerId: string): Promise<Map<string, Store>> {
  const rows = await db.select().from(storeRules).where(eq(storeRules.ownerId, ownerId));
  return new Map(rows.filter((r) => isStore(r.store)).map((r) => [r.normalizedName, r.store as Store]));
}
