import { getDb, getDbPath } from "./client";

async function main() {
  await getDb();
  console.log(`Database ready at ${getDbPath()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
