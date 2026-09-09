import "dotenv/config";
import { createPool, type Pool, type ResultSetHeader } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { DROP_SQL, INIT_SQL } from "./sql";

export type AppDb = MySql2Database<typeof schema>;

type GlobalDb = {
  mysqlPool?: Pool;
  mysqlDb?: AppDb;
};

const globalForDb = globalThis as typeof globalThis & GlobalDb;

function splitStatements(raw: string): string[] {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env file, e.g. mysql://user:password@localhost:3306/company_expenditure",
    );
  }
  return url;
}

export async function applySchema(pool: Pool, options?: { recreate?: boolean }): Promise<void> {
  if (options?.recreate) {
    for (const statement of splitStatements(DROP_SQL)) {
      await pool.query(statement);
    }
  }
  for (const statement of splitStatements(INIT_SQL)) {
    await pool.query(statement);
  }
}

export function createMysqlPool(url = getDatabaseUrl()): Pool {
  return createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    namedPlaceholders: false,
  });
}

export async function createAppDb(
  url = getDatabaseUrl(),
  options?: { recreate?: boolean },
): Promise<{ pool: Pool; db: AppDb }> {
  const pool = createMysqlPool(url);
  await applySchema(pool, options);
  const db = drizzle(pool, { schema, mode: "default" });
  return { pool, db };
}

export async function getDb(): Promise<AppDb> {
  if (globalForDb.mysqlDb) {
    return globalForDb.mysqlDb;
  }

  const { pool, db } = await createAppDb();
  globalForDb.mysqlPool = pool;
  globalForDb.mysqlDb = db;
  return db;
}

export async function getPool(): Promise<Pool> {
  await getDb();
  if (!globalForDb.mysqlPool) {
    throw new Error("MySQL pool was not initialised");
  }
  return globalForDb.mysqlPool;
}

export function nowSqlTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/** MySQL insert helper — returns the new auto-increment id. */
export async function insertIdFromResult(result: unknown): Promise<number> {
  const header = Array.isArray(result) ? (result[0] as ResultSetHeader) : (result as ResultSetHeader);
  const id = Number(header.insertId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Insert did not return an insertId");
  }
  return id;
}

export async function clearAllData(db: AppDb = globalForDb.mysqlDb!): Promise<void> {
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.delete(schema.expenseAllocations);
  await db.delete(schema.projectEmployees);
  await db.delete(schema.invoices);
  await db.delete(schema.expenses);
  await db.delete(schema.projects);
  await db.delete(schema.employees);
  await db.delete(schema.branches);
  await db.delete(schema.organisations);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

/**
 * Runs a callback against the shared MySQL database after clearing all rows.
 * Requires DATABASE_URL. Used by hierarchy/integration tests.
 */
export async function withTestDatabase<T>(fn: (db: AppDb) => Promise<T>): Promise<T> {
  const db = await getDb();
  await clearAllData(db);
  try {
    return await fn(db);
  } finally {
    await clearAllData(db);
  }
}
