/**
 * Optional sections inside one list ("compartments"): a line written as
 * "Family lunch: cod, potatoes" puts those items in the "Family lunch" section.
 * Lines without a "Name:" prefix keep the section of the line above (or none).
 * Pure — no I/O — so it is easy to test.
 */
export type SectionChunk = { section: string | null; text: string };

const MAX_SECTION = 40;

export function cleanSection(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, MAX_SECTION) : null;
}

export function splitSections(text: string): SectionChunk[] {
  const out: SectionChunk[] = [];
  let current: string | null = null;
  for (const line of text.split(/\n/)) {
    const m = /^\s*([^:,;\n\d][^:,;\n]{0,39}):\s*(.*)$/.exec(line);
    let body = line;
    if (m && !/^\s*https?$/i.test(m[1])) {
      current = cleanSection(m[1]);
      body = m[2];
    }
    if (body.trim()) out.push({ section: current, text: body });
  }
  return out;
}
