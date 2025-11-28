import fs from "fs";
import path from "path";
import { sequelize } from "../config/sequelize";

export async function applyMigrations() {
  await sequelize.authenticate();
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)`
  );

  const files = fs
    .readdirSync(path.join(process.cwd(), "src/migrations"))
    .filter((f) => f.endsWith(".ts") && !f.includes("schema-snapshot"));

  for (const file of files) {
    const applied = await sequelize.query(
      `SELECT name FROM migrations WHERE name = '${file}'`
    );
    if (applied[0].length > 0) continue;

    const mig = require(`../migrations/${file}`).default;
    await mig.up(sequelize.getQueryInterface(), sequelize.constructor);

    await sequelize.query(`INSERT INTO migrations (name) VALUES ('${file}')`);
    console.log("Applied:", file);
  }
}
