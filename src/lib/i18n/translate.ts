import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { translations } from "@/db/schema";
import { normalizeName } from "@/lib/parse";
import { PT_EN } from "./pairs";

export type Names = { en: string; pt: string };

const BY_PT = new Map<string, Names>();
const BY_EN = new Map<string, Names>();
for (const [pt, en] of PT_EN) {
  BY_PT.set(normalizeName(pt), { pt, en });
  BY_EN.set(normalizeName(en), { pt, en });
}

const PT_HINT = /[ãõçáéíóúâêôà]|\b(de|do|da|dos|das|com|para|em)\b|(ção|ções|inho|inha|ão|ões)$/i;

function matchCase(src: string, out: string): string {
  return src && src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase()
    ? out.charAt(0).toUpperCase() + out.slice(1)
    : out;
}

async function machine(q: string, pair: "pt|en" | "en|pt"): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${pair}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { responseData?: { translatedText?: string } };
    const out = j.responseData?.translatedText?.trim();
    if (!out || /MYMEMORY|QUERY LENGTH|INVALID/i.test(out)) return null;
    return out.toLowerCase() === q.toLowerCase() ? null : out;
  } catch {
    return null;
  }
}

/**
 * English + Portuguese names for an item someone typed, in either language.
 * Built-in grocery pairs first, then a cache, then a free machine translation
 * (MyMemory, 3 s timeout). Never throws; worst case both names are the original.
 */
export async function translateName(name: string): Promise<Names> {
  const key = normalizeName(name);
  const hit = BY_PT.get(key) ?? BY_EN.get(key);
  if (hit) {
    return BY_PT.has(key)
      ? { pt: name, en: matchCase(name, hit.en) }
      : { en: name, pt: matchCase(name, hit.pt) };
  }
  try {
    const [c] = await db.select().from(translations).where(eq(translations.key, key)).limit(1);
    if (c) return { en: matchCase(name, c.en), pt: matchCase(name, c.pt) };
  } catch {}

  let res: Names | null = null;
  if (PT_HINT.test(name)) {
    const en = await machine(name, "pt|en");
    res = { pt: name, en: en ?? name };
  } else {
    const pt = await machine(name, "en|pt");
    if (pt) res = { en: name, pt };
    else {
      const en = await machine(name, "pt|en");
      res = en ? { pt: name, en } : { en: name, pt: name };
    }
  }
  try {
    await db.insert(translations).values({ key, en: res.en, pt: res.pt }).onConflictDoNothing();
  } catch {}
  return res;
}
