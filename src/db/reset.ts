import "dotenv/config";
import { applySchema, createMysqlPool, getDatabaseUrl } from "./client";

async function main() {
  const url = getDatabaseUrl();
  const pool = createMysqlPool(url);
  await applySchema(pool, { recreate: true });
  await pool.end();
  console.log("MySQL schema reset. Run npm run db:seed to load sample data.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
