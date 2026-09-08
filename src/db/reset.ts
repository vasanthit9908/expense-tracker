import fs from "node:fs";
import { getDbPath } from "./client";

const dbPath = getDbPath();
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const file = `${dbPath}${suffix}`;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}
console.log("Removed local SQLite files. Run npm run db:migrate && npm run db:seed");
