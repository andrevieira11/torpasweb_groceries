"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { categorizeRules, items } from "@/db/schema";
import { resolveGuestToken } from "@/lib/queries/sharing";
import { parseInput, categorize } from "@/lib/parse";
import { applyItems } from "@/lib/items/add";
import { rateLimit } from "@/lib/ratelimit";

const MAX_GUEST_TEXT = 500;
const MAX_GUEST_ITEMS = 20;

/** The token is the only source of the target list — never trust a client id. */
async function guestList(token: string) {
  const resolved = await resolveGuestToken(token);
  if (!resolved) throw new Error("This share link is no longer valid.");
  return resolved.list;
}

function throttle(token: string) {
  const { ok } = rateLimit(`guest:${token}`, 30, 60_000); // 30 writes/min/token
  if (!ok) throw new Error("Too many requests — give it a moment.");
}

export async function guestAddItems(input: {
  token: string;
  text: string;
  displayName?: string | null;
}) {
  const { token, text, displayName } = z
    .object({
      token: z.string().min(1),
      text: z.string().min(1).max(MAX_GUEST_TEXT),
      displayName: z.string().max(40).nullable().optional(),
    })
    .parse(input);

  throttle(token);
  const list = await guestList(token);

  const parsed = parseInput(text).slice(0, MAX_GUEST_ITEMS);
  if (parsed.length === 0) return { added: 0, merged: 0 };

  const rules = await db
    .select()
    .from(categorizeRules)
    .where(eq(categorizeRules.ownerId, list.ownerId));
  const learned = new Map(rules.map((r) => [r.normalizedName, r.categoryKey]));

  const name = displayName?.trim() ? displayName.trim().slice(0, 40) : "Guest";
  const res = await applyItems(
    list.id,
    parsed.map((p) => ({
      name: p.name,
      normalizedName: p.normalizedName,
      qty: p.qty,
      unit: p.unit,
      categoryKey: categorize(p.name, learned),
    })),
    null,
    name,
  );

  revalidatePath(`/g/${token}`);
  return res;
}

export async function guestToggleItem(input: { token: string; itemId: string }) {
  const { token, itemId } = z
    .object({ token: z.string().min(1), itemId: z.string().min(1) })
    .parse(input);

  throttle(token);
  const list = await guestList(token);

  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item || item.listId !== list.id) throw new Error("Not found"); // must belong to the token's list

  const checked = !item.checked;
  await db
    .update(items)
    .set({ checked, checkedAt: checked ? new Date() : null, updatedAt: new Date() })
    .where(eq(items.id, itemId));

  revalidatePath(`/g/${token}`);
  return { checked };
}
