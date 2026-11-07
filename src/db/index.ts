import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// One shared connection pool. It only connects on the first query,
// so builds work without a database.
const client = postgres(process.env.DATABASE_URL ?? "postgres://localhost/vouchly", { max: 5 });
export const db = drizzle(client, { schema });
