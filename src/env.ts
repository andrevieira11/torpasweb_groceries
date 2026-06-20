import { z } from "zod";

/**
 * Server environment, validated once at import. Presence-checked (not format-
 * strict) so a single missing secret fails loudly with a readable message.
 * NEXT_PUBLIC_* values are inlined by Next at build time and read directly via
 * `process.env` where needed — they are intentionally not gated here.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  INGEST_WEBHOOK_TOKEN: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid server environment:\n${lines.join("\n")}`);
}

export const env = parsed.data;
