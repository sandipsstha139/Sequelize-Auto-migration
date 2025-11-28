import fs from "fs";
import path from "path";
import { sequelize } from "../config/sequelize";
import { DatabaseSchema } from "./schema-types";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "src/migrations/schema-snapshot.json"
);

export function loadSnapshot(): DatabaseSchema {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return { tables: [], enums: {} };
  }
  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8") || "{}";
  const json = JSON.parse(raw);
  return {
    tables: json.tables || [],
    enums: json.enums || {},
  };
}

export function saveSnapshot(schema: DatabaseSchema): void {
  const dir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(schema, null, 2), "utf8");
}

export async function ensureMigrationsTable() {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS "_migrations" (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL UNIQUE,
       applied_at TIMESTAMPTZ DEFAULT NOW()
     )`
  );
}

export async function getAppliedMigrations(): Promise<string[]> {
  const [rows] = await sequelize.query(
    `SELECT name FROM "_migrations" ORDER BY name ASC`
  );
  return (rows as any[]).map((r) => r.name as string);
}

export async function markMigrationApplied(name: string) {
  await sequelize.query(
    `INSERT INTO "_migrations"(name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    { bind: [name] }
  );
}
