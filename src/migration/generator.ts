import fs from "fs";
import path from "path";
import { MigrationAction } from "./schema-types";

function mapType(dbType: string) {
  const raw = dbType.toUpperCase();

  if (raw.startsWith("ENUM(")) {
    const values = raw
      .replace("ENUM(", "")
      .replace(")", "")
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""));

    return `Sequelize.ENUM(${values.map((v) => `"${v}"`).join(", ")})`;
  }

  if (raw.includes("TIMESTAMP") || raw.includes("DATE"))
    return "Sequelize.DATE";
  if (raw.includes("UUID")) return "Sequelize.UUID";
  if (raw.includes("BIGINT")) return "Sequelize.BIGINT";
  if (raw.includes("INT")) return "Sequelize.INTEGER";
  if (raw.includes("TEXT")) return "Sequelize.TEXT";
  if (raw.includes("CHAR") || raw.includes("STRING")) return "Sequelize.STRING";
  if (raw.includes("BOOLEAN")) return "Sequelize.BOOLEAN";
  if (raw.includes("JSON")) return "Sequelize.JSON";
  if (raw.includes("DECIMAL")) return "Sequelize.DECIMAL";
  if (raw.includes("FLOAT") || raw.includes("REAL")) return "Sequelize.FLOAT";

  return "Sequelize.STRING";
}

function col(c: any) {
  return `{
    type: ${mapType(c.dbType)},
    allowNull: ${c.allowNull},
    primaryKey: ${c.primaryKey},
    unique: ${c.unique},
    defaultValue: ${
      c.defaultValue === null ? "null" : JSON.stringify(c.defaultValue)
    }
  }`;
}

export function generate(actions: MigrationAction[]): string | null {
  if (!actions.length) return null;

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${ts}-auto-migration.js`;
  const dir = path.join(process.cwd(), "src/migrations");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const up: string[] = [];
  const down: string[] = [];

  actions.forEach((a) => {
    if (a.kind === "createTable") {
      const columns = a.table.columns
        .map((c) => `"${c.name}": ${col(c)}`)
        .join(",\n      ");

      up.push(`await queryInterface.createTable("${a.table.name}", {
      ${columns}
    });`);

      down.push(`await queryInterface.dropTable("${a.table.name}");`);
    }

    if (a.kind === "addColumn") {
      up.push(
        `await queryInterface.addColumn("${a.tableName}", "${
          a.column.name
        }", ${col(a.column)});`
      );
      down.push(
        `await queryInterface.removeColumn("${a.tableName}", "${a.column.name}");`
      );
    }

    if (a.kind === "dropColumn") {
      up.push(
        `await queryInterface.removeColumn("${a.tableName}", "${a.columnName}");`
      );
    }

    if (a.kind === "alterColumn") {
      up.push(
        `await queryInterface.changeColumn("${a.tableName}", "${
          a.after.name
        }", ${col(a.after)});`
      );
    }

    if (a.kind === "createIndex") {
      up.push(
        `await queryInterface.addIndex("${a.tableName}", ${JSON.stringify(
          a.index.columns
        )}, { name: "${a.index.name}", unique: ${a.index.unique} });`
      );
      down.push(
        `await queryInterface.removeIndex("${a.tableName}", "${a.index.name}");`
      );
    }

    if (a.kind === "dropIndex") {
      up.push(
        `await queryInterface.removeIndex("${a.tableName}", "${a.indexName}");`
      );
    }

    if (a.kind === "addFK") {
      up.push(`await queryInterface.addConstraint("${a.tableName}", {
  type: "foreign key",
  fields: ["${a.fk.column}"],
  name: "${a.fk.name}",
  references: { table: "${a.fk.referencedTable}", field: "${
        a.fk.referencedColumn
      }" },
  onDelete: ${a.fk.onDelete ? `"${a.fk.onDelete}"` : "null"},
  onUpdate: ${a.fk.onUpdate ? `"${a.fk.onUpdate}"` : "null"}
});`);

      down.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.fk.name}");`
      );
    }

    if (a.kind === "dropFK") {
      up.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.fkName}");`
      );
    }

    if (a.kind === "addUnique") {
      up.push(`await queryInterface.addConstraint("${a.tableName}", {
    type: "unique",
    name: "${a.unique.name}",
    fields: ${JSON.stringify(a.unique.columns)}
  });`);
      down.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.unique.name}");`
      );
    }

    if (a.kind === "dropUnique") {
      up.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.uniqueName}");`
      );
    }

    if (a.kind === "createEnum") {
      up.push(`await queryInterface.sequelize.query(
  'CREATE TYPE "${a.enum.name}" AS ENUM (${a.enum.values
        .map((v) => `'${v}'`)
        .join(", ")})'
);`);
      down.push(
        `await queryInterface.sequelize.query('DROP TYPE "${a.enum.name}"');`
      );
    }

    if (a.kind === "alterEnum") {
      up.push(`await queryInterface.sequelize.query(
  'ALTER TYPE "${a.after.name}" ADD VALUE IF NOT EXISTS ${a.after.values
        .map((v) => `'${v}'`)
        .join(", ")}'
);`);
      down.push(`-- manual rollback required for enum value removal`);
    }

    if (a.kind === "dropEnum") {
      up.push(
        `await queryInterface.sequelize.query('DROP TYPE IF EXISTS "${a.enumName}"');`
      );
    }
  });

  const content = `
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    ${up.join("\n    ")}
  },
  async down(queryInterface, Sequelize) {
    ${down.join("\n    ")}
  },
};
`;

  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}
