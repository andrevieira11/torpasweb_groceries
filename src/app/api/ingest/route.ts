import { env } from "@/env";
import { constantTimeEqual } from "@/lib/token";
import { rateLimit } from "@/lib/ratelimit";
import { getIngestTargetList } from "@/lib/queries/lists";
import { ingestText } from "@/lib/items/ingest";

export const runtime = "nodejs";

const MAX_BODY = 2048; // bytes — a grocery line, not a payload

/**
 * Siri / Shortcuts ingest. Bearer-token gated (constant-time compare),
 * rate-limited, body-capped. Accepts JSON {"text":"..."} or text/plain and
 * routes the free text through the shared ingestText() parser into the owner's
 * default list. See docs/SIRI.md.
 */
export async function POST(request: Request) {
  const configured = env.INGEST_WEBHOOK_TOKEN;
  if (!configured) {
    return Response.json({ error: "Ingest is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!presented || !constantTimeEqual(presented, configured)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`ingest:${ip}`, 60, 60_000); // 60/min
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) },
      },
    );
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) {
    return Response.json({ error: "Body too large" }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return Response.json({ error: "Body too large" }, { status: 413 });
  }

  let text = raw;
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const parsed = JSON.parse(raw) as { text?: unknown };
      text = typeof parsed.text === "string" ? parsed.text : "";
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  text = text.trim();
  if (!text) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const target = await getIngestTargetList();
  if (!target) {
    return Response.json({ error: "No list available" }, { status: 409 });
  }

  const result = await ingestText({
    list: target,
    text,
    addedByUserId: target.ownerId,
    addedByName: "Siri",
  });

  return Response.json({ ok: true, message: spokenMessage(result), ...result });
}

/** A short sentence the Shortcut can read back, e.g. "Added onions, milk and eggs". */
function spokenMessage(r: {
  kind: string;
  recipe?: string;
  added: number;
  merged: number;
  names: string[];
}): string {
  if (r.names.length === 0) return "Nothing to add";
  if (r.kind === "recipe") {
    const n = r.added + r.merged;
    return `Added ${r.recipe}: ${n} ingredient${n === 1 ? "" : "s"}`;
  }
  const names = r.names;
  if (names.length === 1) return `Added ${names[0]}`;
  if (names.length <= 3) {
    return `Added ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `Added ${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

export function GET() {
  return Response.json({
    ok: true,
    hint: 'POST text (JSON {"text":"..."} or text/plain) with header Authorization: Bearer <token>.',
  });
}
