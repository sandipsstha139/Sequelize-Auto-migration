import fs from "fs";
import path from "path";
import { loadModelDefinitions } from "./loader";
import { diffSchemas } from "./diff";
import { generateMigration } from "./generator";
import { applyMigrations } from "./apply";

async function run() {
  const snapFile = path.join(process.cwd(), "src/migrations/schema-snapshot.json");

  const oldSchema = fs.existsSync(snapFile)
    ? JSON.parse(fs.readFileSync(snapFile).toString())
    : {};

  const newSchema = await loadModelDefinitions();

  const actions = diffSchemas(oldSchema, newSchema);

  if (actions.length === 0) {
    console.log("No schema changes");
    return;
  }

  const filePath = generateMigration(actions);
  console.log("Generated migration:", filePath);

  fs.writeFileSync(snapFile, JSON.stringify(newSchema, null, 2));

  await applyMigrations();
}

run();
