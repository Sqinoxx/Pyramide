import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // A dedicated single connection for running migrations, separate from the
  // app's pooled client in src/db/index.ts.
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("[migrate] applying pending migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] done");

  await client.end();
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
