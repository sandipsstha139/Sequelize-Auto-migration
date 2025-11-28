import fs from "fs";
import path from "path";
import "reflect-metadata";
import { sequelize } from "../config/sequelize";
import { diffSchemas } from "./diff";
import { generateMigrationFile } from "./generator";
import { introspectDatabaseSchema } from "./introspect";
import {
  ensureMigrationsTable,
  getAppliedMigrations,
  loadSnapshot,
  markMigrationApplied,
  saveSnapshot,
} from "./state";

async function applyMigrationFile(filePath: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const migration = require(filePath).default;

  if (!migration || typeof migration.up !== "function") {
    console.warn(
      `Migration file ${filePath} has no valid default export with 'up'`
    );
    return;
  }

  const qi = sequelize.getQueryInterface();
  await migration.up(qi, require("sequelize"));
}

async function run() {
  try {
    await sequelize.authenticate();
    await ensureMigrationsTable();

    const beforeSchema = loadSnapshot();
    const afterSchema = await introspectDatabaseSchema();

    const actions = diffSchemas(beforeSchema, afterSchema);

    if (!actions.length) {
      console.log("✅ No schema changes detected.");
      await sequelize.close();
      return;
    }

    console.log(
      `Detected ${actions.length} schema changes. Generating migration...`
    );

    const newFile = generateMigrationFile(actions);
    if (!newFile) {
      console.log("Nothing to migrate.");
      await sequelize.close();
      return;
    }

    console.log("Generated migration:", path.basename(newFile));

    // apply all pending migrations (existing + new one)
    const migrationsDir = path.join(process.cwd(), "src/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    const applied = await getAppliedMigrations();

    for (const file of files) {
      if (file === "schema-snapshot.json") continue;
      if (applied.includes(file)) continue;

      const fullPath = path.join(migrationsDir, file);
      console.log("Applying migration:", file);
      await applyMigrationFile(fullPath);
      await markMigrationApplied(file);
      console.log("✅ Applied:", file);
    }

    // update snapshot
    saveSnapshot(afterSchema);

    await sequelize.close();
    console.log("✅ Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    await sequelize.close();
    process.exit(1);
  }
}

run();
