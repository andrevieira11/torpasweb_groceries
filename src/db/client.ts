import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Reuse one postgres-js connection across dev hot-reloads (avoids exhausting
// connections). The connection is lazy — constructing it does not dial the DB,
// so importing this during `next build` is safe even without a live database.
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

const sql = globalForDb.sql ?? postgres(env.DATABASE_URL, { prepare: false });
if (env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
