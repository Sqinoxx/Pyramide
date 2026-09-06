import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
   
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the connection across hot-reloads in dev; Next.js re-evaluates
// modules on every edit, and a fresh postgres.js pool per reload quickly
// exhausts Postgres's max_connections.
const client =
  global.__pgClient ??
  postgres(connectionString, { max: process.env.NODE_ENV === "production" ? 10 : 5 });

if (process.env.NODE_ENV !== "production") {
  global.__pgClient = client;
}

export const db = drizzle(client, { schema });
export type Db = typeof db;
