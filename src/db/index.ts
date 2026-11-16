import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// One shared connection pool, kept on globalThis so dev reloads don't open more.
// It only connects on the first query, so builds work without a database.
const g = globalThis as unknown as { vlSql?: ReturnType<typeof postgres> };
const client = (g.vlSql ??= postgres(process.env.DATABASE_URL ?? "postgres://localhost/vouchly", { max: 5, idle_timeout: 20 }));
export const db = drizzle(client, { schema });
