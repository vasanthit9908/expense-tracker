import fs from "node:fs";
import { applySchema, createSqliteClient, getDbPath } from "./client";

async function main() {
  const dbPath = getDbPath();
  fs.mkdirSync(dbPath.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  const client = createSqliteClient(`file:${dbPath.replace(/\\/g, "/")}`);
  await applySchema(client, { recreate: true });
  client.close();
  console.log(`Schema recreated at ${dbPath}. Run npm run db:seed to load sample data.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
