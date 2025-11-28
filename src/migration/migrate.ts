import { execa } from "execa";
import { diff } from "./diff";
import { generate } from "./generator";
import { introspect } from "./introspect";
import { loadSnapshot, saveSnapshot } from "./state";

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
  await execa("npx", ["sequelize-cli", "db:migrate"], {
    stdio: "inherit",
  });
}

export async function rollbackLast() {
  await execa("npx", ["sequelize-cli", "db:migrate:undo"], {
    stdio: "inherit",
  });
}
