import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { DROP_SQL, INIT_SQL } from "./sql";

export type AppDb = LibSQLDatabase<typeof schema>;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app.db");

type GlobalDb = {
  sqliteClient?: Client;
  sqliteDb?: AppDb;
};

const globalForDb = globalThis as typeof globalThis & GlobalDb;

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`);
}

export async function applySchema(client: Client, options?: { recreate?: boolean }): Promise<void> {
  if (options?.recreate) {
    for (const statement of splitStatements(DROP_SQL)) {
      await client.execute(statement);
    }
  }
  await client.execute("PRAGMA foreign_keys = ON;");
  for (const statement of splitStatements(INIT_SQL)) {
    await client.execute(statement);
  }
}

export function createSqliteClient(url: string): Client {
  return createClient({ url });
}

export async function createAppDb(url: string): Promise<{ client: Client; db: AppDb }> {
  const client = createSqliteClient(url);
  await applySchema(client);
  const db = drizzle(client, { schema });
  return { client, db };
}

export function getDbPath(): string {
  return DB_FILE;
}

export async function getDb(): Promise<AppDb> {
  if (globalForDb.sqliteDb) {
    await globalForDb.sqliteClient?.execute("PRAGMA foreign_keys = ON;");
    return globalForDb.sqliteDb;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const url = `file:${DB_FILE.replace(/\\/g, "/")}`;
  const { client, db } = await createAppDb(url);
  globalForDb.sqliteClient = client;
  globalForDb.sqliteDb = db;
  return db;
}

export async function getClient(): Promise<Client> {
  await getDb();
  if (!globalForDb.sqliteClient) {
    throw new Error("SQLite client was not initialised");
  }
  return globalForDb.sqliteClient;
}

export async function withTestDatabase<T>(fn: (db: AppDb) => Promise<T>): Promise<T> {
  const previousDb = globalForDb.sqliteDb;
  const previousClient = globalForDb.sqliteClient;
  const { client, db } = await createAppDb(":memory:");
  globalForDb.sqliteDb = db;
  globalForDb.sqliteClient = client;
  try {
    return await fn(db);
  } finally {
    globalForDb.sqliteDb = previousDb;
    globalForDb.sqliteClient = previousClient;
    client.close();
  }
}
