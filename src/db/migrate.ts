import "dotenv/config";
import { applySchema, createMysqlPool, getDatabaseUrl } from "./client";

async function main() {
  const recreate = process.argv.includes("--recreate");
  const url = getDatabaseUrl();
  const pool = createMysqlPool(url);
  await applySchema(pool, { recreate });
  await pool.end();
  console.log(`MySQL schema ready${recreate ? " (recreated)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
