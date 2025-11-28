import fs from "fs";
import path from "path";
import { DatabaseSchema } from "./schema-types";

const file = path.join(process.cwd(), "src/migrations/schema-snapshot.json");

export function loadSnapshot(): DatabaseSchema {
  if (!fs.existsSync(file)) return { tables: [], enums: {} };
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json;
}

export function saveSnapshot(schema: DatabaseSchema) {
  fs.writeFileSync(file, JSON.stringify(schema, null, 2));
}
