import fs from "node:fs";
import { applySchema, createSqliteClient, getDbPath } from "./client";

async function main() {
  const recreate = process.argv.includes("--recreate");
  const dbPath = getDbPath();
  fs.mkdirSync(dbPath.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  const url = `file:${dbPath.replace(/\\/g, "/")}`;
  const client = createSqliteClient(url);
  await applySchema(client, { recreate });
  client.close();
  console.log(`Database ready at ${dbPath}${recreate ? " (recreated)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
