import { execa } from "execa";
import fs from "fs";
import path from "path";
import { diff } from "./diff";
import { generate } from "./generator";
import { introspect } from "./introspect";
import { loadSnapshot, saveSnapshot } from "./state";

function hasSequelizeCli() {
  const cwd = process.cwd();
  const cliPath1 = path.join(cwd, "node_modules/.bin/sequelize");
  const cliPath2 = path.join(cwd, "node_modules/.bin/sequelize-cli");
  return fs.existsSync(cliPath1) || fs.existsSync(cliPath2);
}

export async function preview() {
  const before = loadSnapshot();
  const after = await introspect();
  const actions = diff(before, after);
  console.log(JSON.stringify(actions, null, 2));
}

export async function generateMigration() {
  const before = loadSnapshot();
  const after = await introspect();
  const actions = diff(before, after);

  if (!actions.length) {
    console.log("No schema changes detected. No migration generated.");
    return;
  }

  const file = generate(actions);
  saveSnapshot(after);
  console.log("Generated migration:", file);
}

export async function runMigrations() {
  if (!hasSequelizeCli()) {
    console.log("❌ sequelize-cli not found in this project.");
    console.log("Install it with:");
    console.log("  pnpm add -D sequelize-cli");
    return;
  }

  console.log("▶ Running migrations via sequelize-cli...\n");

  await execa("npx", ["sequelize-cli", "db:migrate"], {
    stdio: "inherit",
  });
}

export async function rollbackLast() {
  if (!hasSequelizeCli()) {
    console.log("❌ sequelize-cli not found in this project.");
    console.log("Install it with:");
    console.log("  pnpm add -D sequelize-cli");
    return;
  }

  console.log("▶ Rolling back last migration via sequelize-cli...\n");

  await execa("npx", ["sequelize-cli", "db:migrate:undo"], {
    stdio: "inherit",
  });
}

export async function rebuildSnapshot() {
  console.log("⚠️ Rebuilding snapshot in 3 seconds...");
  await new Promise((r) => setTimeout(r, 3000));

  const db = await introspect();
  saveSnapshot(db);

  console.log("✓ Snapshot rebuilt.");
}

export async function validateSnapshot() {
  const snapshot = loadSnapshot();
  const actual = await introspect();
  const actions = diff(snapshot, actual);

  if (actions.length === 0) {
    console.log("✓ Snapshot is in sync with database.");
    return;
  }

  console.log("⚠️ Snapshot is OUT OF SYNC:");
  console.log(JSON.stringify(actions, null, 2));
}
