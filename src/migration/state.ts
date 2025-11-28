import fs from "fs";
import path from "path";
import { DatabaseSchema } from "./schema-types";

const SNAPSHOT_FILE = path.join(
  process.cwd(),
  "src/migrations/schema-snapshot.json"
);

export function loadSnapshot(): DatabaseSchema {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return { tables: [] };
  }
  const raw = fs.readFileSync(SNAPSHOT_FILE, "utf8");
  return JSON.parse(raw) as DatabaseSchema;
}

export function saveSnapshot(schema: DatabaseSchema) {
  const dir = path.dirname(SNAPSHOT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(schema, null, 2));
}
