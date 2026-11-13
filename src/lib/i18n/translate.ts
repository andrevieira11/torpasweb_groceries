import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { translations } from "@/db/schema";
import { normalizeName } from "@/lib/parse";
import { PT_EN } from "./pairs";
import { plausibleTranslation, usableName } from "./plausible";
import type { Lang } from "./strings";

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

/**
 * Free machine translation (MyMemory, 3 s timeout). undefined = the service failed (don't
 * remember that), null = the same word came back, else the raw text — junk included: it is
 * judged where it is used (`usableName`), so the cache keeps what the service said and a
 * later change to the junk filter also applies to words looked up before it.
 */
async function machine(q: string, from: Lang, to: Lang): Promise<string | null | undefined> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|${to}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { responseData?: { translatedText?: string } };
    const out = j.responseData?.translatedText?.trim();
    if (!out || /MYMEMORY|QUERY LENGTH|INVALID/i.test(out)) return undefined;
    return out.toLowerCase() === q.toLowerCase() ? null : out;
  } catch {
    return undefined;
  }
}

async function cached(key: string): Promise<Names | null> {
  try {
    const [c] = await db.select().from(translations).where(eq(translations.key, key)).limit(1);
    return c ? { en: c.en, pt: c.pt } : null;
  } catch {
    return null;
  }
}

async function remember(key: string, n: Names) {
  try {
    await db
      .insert(translations)
      .values({ key, en: n.en, pt: n.pt })
      .onConflictDoNothing(); // first answer wins; never overwrite a good row with a worse one
  } catch {}
}

/** `out` (cased like what was typed) when it is believable for `src`, else what was typed. */
const judged = (src: string, out: string | null | undefined) =>
  usableName(src, out) ? matchCase(src, out) : src;

/**
 * English + Portuguese names for an item someone typed. With the typer's UI language (`lang`)
 * the typed name is kept as-is for that language — the row never changes under their finger —
 * and only the other language is looked up: built-in grocery pairs, then a cache, then a free
 * machine translation whose junk is refused. Without `lang` (Siri, guests, old rows) the
 * language is guessed as before. Never throws; worst case both names are the original.
 */
export async function translateName(name: string, lang?: Lang): Promise<Names> {
  const key = normalizeName(name);
  if (!lang) return guess(name, key);

  const to: Lang = lang === "pt" ? "en" : "pt";
  const pick = (other: string): Names => (lang === "pt" ? { pt: name, en: other } : { en: name, pt: other });
  const own = (lang === "pt" ? BY_PT : BY_EN).get(key);
  if (own) return pick(matchCase(name, own[to]));
  // A word of the other language ("eggs" typed in the PT app) is already its own translation.
  if ((lang === "pt" ? BY_EN : BY_PT).has(key) || !key) return pick(name);

  const ckey = `${lang}:${key}`; // direction-specific: "banana" PT→EN ≠ EN→PT
  const c = await cached(ckey);
  if (c) return pick(judged(name, c[to])); // a cached word never costs another lookup

  const out = await machine(name, lang, to);
  if (out !== undefined) await remember(ckey, pick(out ?? name)); // raw: judged when read
  return pick(judged(name, out));
}

/** No UI language to go by: guess PT or EN from the word (the pre-2026-11-13 behaviour). */
async function guess(name: string, key: string): Promise<Names> {
  const hit = BY_PT.get(key) ?? BY_EN.get(key);
  if (hit) {
    return BY_PT.has(key)
      ? { pt: name, en: matchCase(name, hit.en) }
      : { en: name, pt: matchCase(name, hit.pt) };
  }
  if (!key) return { en: name, pt: name };
  const c = await cached(key);
  if (c) return { en: judged(name, c.en), pt: judged(name, c.pt) };

  let raw: Names;
  let answered = true;
  if (PT_HINT.test(name)) {
    const en = await machine(name, "pt", "en");
    answered = en !== undefined;
    raw = { pt: name, en: en ?? name };
  } else {
    const pt = await machine(name, "en", "pt");
    // Junk back from EN→PT: maybe the word is Portuguese after all.
    if (pt && plausibleTranslation(name, pt)) raw = { en: name, pt };
    else {
      const en = await machine(name, "pt", "en");
      answered = pt !== undefined && en !== undefined;
      raw = en ? { pt: name, en } : { en: name, pt: name };
    }
  }
  if (answered) await remember(key, raw);
  return { en: judged(name, raw.en), pt: judged(name, raw.pt) };
}
