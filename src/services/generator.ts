import fs from "fs";
import path from "path";
import { MigrationAction } from "./schema-types";

function mapType(dbType: string, enumValues?: string[]) {
  const upper = dbType.toUpperCase();

  if (upper.includes("[]") || upper.includes("ARRAY")) {
    let innerType = "Sequelize.STRING";

    const bracketMatch = dbType.match(/^([A-Z]+)(?:\([^)]+\))?\[\]/i);
    const arrayMatch = dbType.match(/ARRAY\((.*?)\)/i);

    if (bracketMatch) {
      const baseType = bracketMatch[1].toUpperCase();
      if (baseType.includes("INT")) innerType = "Sequelize.INTEGER";
      else if (baseType.includes("BIGINT")) innerType = "Sequelize.BIGINT";
      else if (baseType.includes("TEXT")) innerType = "Sequelize.TEXT";
      else if (baseType.includes("BOOLEAN")) innerType = "Sequelize.BOOLEAN";
      else if (baseType.includes("DATE") || baseType.includes("TIMESTAMP"))
        innerType = "Sequelize.DATE";
      else if (baseType.includes("UUID")) innerType = "Sequelize.UUID";
      else if (baseType.includes("JSON")) innerType = "Sequelize.JSON";
      else if (baseType.includes("JSONB")) innerType = "Sequelize.JSONB";
      else if (baseType.includes("DECIMAL")) innerType = "Sequelize.DECIMAL";
      else if (baseType.includes("FLOAT") || baseType.includes("REAL"))
        innerType = "Sequelize.FLOAT";
      else innerType = "Sequelize.STRING";
    } else if (arrayMatch) {
      const baseType = arrayMatch[1].toUpperCase();
      if (baseType.includes("INT")) innerType = "Sequelize.INTEGER";
      else if (baseType.includes("BIGINT")) innerType = "Sequelize.BIGINT";
      else if (baseType.includes("TEXT")) innerType = "Sequelize.TEXT";
      else if (baseType.includes("BOOLEAN")) innerType = "Sequelize.BOOLEAN";
      else if (baseType.includes("DATE") || baseType.includes("TIMESTAMP"))
        innerType = "Sequelize.DATE";
      else if (baseType.includes("UUID")) innerType = "Sequelize.UUID";
      else if (baseType.includes("JSON")) innerType = "Sequelize.JSON";
      else if (baseType.includes("JSONB")) innerType = "Sequelize.JSONB";
      else if (baseType.includes("DECIMAL")) innerType = "Sequelize.DECIMAL";
      else if (baseType.includes("FLOAT") || baseType.includes("REAL"))
        innerType = "Sequelize.FLOAT";
      else innerType = "Sequelize.STRING";
    }

    return `Sequelize.ARRAY(${innerType})`;
  }

  if (upper.startsWith("ENUM") || upper.includes("ENUM(") || enumValues) {
    if (enumValues && enumValues.length > 0) {
      return `Sequelize.ENUM(${enumValues.map((v) => `"${v}"`).join(", ")})`;
    }
    const startIdx = dbType.indexOf("(");
    const endIdx = dbType.lastIndexOf(")");
    if (startIdx !== -1 && endIdx !== -1) {
      const inner = dbType.slice(startIdx + 1, endIdx);
      const values = inner
        .split(",")
        .map((v) => v.trim().replace(/^["']+|["']+$/g, ""));
      return `Sequelize.ENUM(${values.map((v) => `"${v}"`).join(", ")})`;
    }
  }

  if (upper.includes("TIMESTAMP") || upper.includes("DATE"))
    return "Sequelize.DATE";
  if (upper.includes("UUID")) return "Sequelize.UUID";
  if (upper.includes("BIGINT")) return "Sequelize.BIGINT";
  if (upper.includes("INT")) return "Sequelize.INTEGER";
  if (upper.includes("TEXT")) return "Sequelize.TEXT";
  if (upper.includes("CHAR") || upper.includes("STRING"))
    return "Sequelize.STRING";
  if (upper.includes("BOOLEAN")) return "Sequelize.BOOLEAN";
  if (upper.includes("JSONB")) return "Sequelize.JSONB";
  if (upper.includes("JSON")) return "Sequelize.JSON";
  if (upper.includes("DECIMAL")) return "Sequelize.DECIMAL";
  if (upper.includes("FLOAT") || upper.includes("REAL"))
    return "Sequelize.FLOAT";

  return "Sequelize.STRING";
}

function col(c: any) {
  const parts: string[] = [];

  parts.push(`type: ${mapType(c.dbType, c.enumValues)}`);

  parts.push(`allowNull: ${c.allowNull}`);

  parts.push(`primaryKey: ${c.primaryKey}`);

  parts.push(`unique: ${c.unique}`);

  if (c.hasOwnProperty("defaultValue")) {
    let defaultValue = "null";

    if (c.defaultValue === "NOW") {
      defaultValue = 'Sequelize.fn("NOW")';
    } else if (c.defaultValue === "UUID_FUNCTION") {
      defaultValue = 'Sequelize.fn("gen_random_uuid")';
    } else if (c.defaultValue !== null && c.defaultValue !== undefined) {
      const defaultStr = String(c.defaultValue);

      if (
        typeof c.defaultValue === "function" ||
        defaultStr === "[Function]" ||
        defaultStr.includes("function")
      ) {
        if (
          c.name === "id" &&
          (c.type === "UUID" || c.dbType?.includes("UUID"))
        ) {
          defaultValue = 'Sequelize.fn("gen_random_uuid")';
        } else {
          defaultValue = "Sequelize.UUIDV4";
        }
      } else if (Array.isArray(c.defaultValue)) {
        defaultValue = JSON.stringify(c.defaultValue);
      } else {
        defaultValue = JSON.stringify(c.defaultValue);
      }
    } else if (
      c.name === "id" &&
      c.primaryKey &&
      (c.type === "UUID" || c.dbType?.includes("UUID"))
    ) {
      defaultValue = 'Sequelize.fn("gen_random_uuid")';
    }

    parts.push(`defaultValue: ${defaultValue}`);
  }

  return `{
    ${parts.join(",\n    ")}
  }`;
}

export function generate(actions: MigrationAction[]): string | null {
  if (!actions.length) return null;

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${ts}-auto-migration.cjs`;
  const dir = path.join(process.cwd(), "src/migrations");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const createTables: string[] = [];
  const addConstraints: string[] = [];
  const addIndexes: string[] = [];
  const otherUp: string[] = [];

  const dropConstraints: string[] = [];
  const dropTables: string[] = [];
  const otherDown: string[] = [];

  actions.forEach((a) => {
    if (a.kind === "createTable") {
      const columns = a.table.columns
        .map((c) => `"${c.name}": ${col(c)}`)
        .join(",\n      ");

      createTables.push(`await queryInterface.createTable("${a.table.name}", {
      ${columns}
    });`);

      a.table.foreignKeys.forEach((fk) => {
        addConstraints.push(`await queryInterface.addConstraint("${
          a.table.name
        }", {
      type: "foreign key",
      fields: ["${fk.column}"],
      name: "${fk.name}",
      references: { table: "${fk.referencedTable}", field: "${
          fk.referencedColumn
        }" },
      onDelete: ${fk.onDelete ? `"${fk.onDelete}"` : "null"},
      onUpdate: ${fk.onUpdate ? `"${fk.onUpdate}"` : "null"}
    });`);

        dropConstraints.push(
          `await queryInterface.removeConstraint("${a.table.name}", "${fk.name}");`
        );
      });

      a.table.uniques.forEach((u) => {
        addConstraints.push(`await queryInterface.addConstraint("${
          a.table.name
        }", {
      type: "unique",
      name: "${u.name}",
      fields: ${JSON.stringify(u.columns)}
    });`);

        dropConstraints.push(
          `await queryInterface.removeConstraint("${a.table.name}", "${u.name}");`
        );
      });

      a.table.indexes.forEach((idx) => {
        if (!idx.unique) {
          const options: any = {
            name: idx.name,
            unique: idx.unique,
          };
          if (idx.where) options.where = idx.where;

          addIndexes.push(
            `await queryInterface.addIndex("${a.table.name}", ${JSON.stringify(
              idx.columns
            )}, ${JSON.stringify(options)});`
          );
        }
      });

      dropTables.push(`await queryInterface.dropTable("${a.table.name}");`);
    }

    if (a.kind === "dropTable") {
      otherUp.push(`await queryInterface.dropTable("${a.tableName}");`);
    }

    if (a.kind === "addColumn") {
      otherUp.push(
        `await queryInterface.addColumn("${a.tableName}", "${
          a.column.name
        }", ${col(a.column)});`
      );
      otherDown.unshift(
        `await queryInterface.removeColumn("${a.tableName}", "${a.column.name}");`
      );
    }

    if (a.kind === "dropColumn") {
      otherUp.push(
        `await queryInterface.removeColumn("${a.tableName}", "${a.columnName}");`
      );
    }

    if (a.kind === "alterColumn") {
      otherUp.push(
        `await queryInterface.changeColumn("${a.tableName}", "${
          a.after.name
        }", ${col(a.after)});`
      );
      otherDown.unshift(
        `await queryInterface.changeColumn("${a.tableName}", "${
          a.before.name
        }", ${col(a.before)});`
      );
    }

    if (a.kind === "createIndex") {
      const options: any = {
        name: a.index.name,
        unique: a.index.unique,
      };
      if (a.index.where) options.where = a.index.where;

      otherUp.push(
        `await queryInterface.addIndex("${a.tableName}", ${JSON.stringify(
          a.index.columns
        )}, ${JSON.stringify(options)});`
      );
      otherDown.unshift(
        `await queryInterface.removeIndex("${a.tableName}", "${a.index.name}");`
      );
    }

    if (a.kind === "dropIndex") {
      otherUp.push(
        `await queryInterface.removeIndex("${a.tableName}", "${a.indexName}");`
      );
    }

    if (a.kind === "addFK") {
      otherUp.push(`await queryInterface.addConstraint("${a.tableName}", {
  type: "foreign key",
  fields: ["${a.fk.column}"],
  name: "${a.fk.name}",
  references: { table: "${a.fk.referencedTable}", field: "${
        a.fk.referencedColumn
      }" },
  onDelete: ${a.fk.onDelete ? `"${a.fk.onDelete}"` : "null"},
  onUpdate: ${a.fk.onUpdate ? `"${a.fk.onUpdate}"` : "null"}
});`);

      otherDown.unshift(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.fk.name}");`
      );
    }

    if (a.kind === "dropFK") {
      otherUp.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.fkName}");`
      );
    }

    if (a.kind === "addUnique") {
      otherUp.push(`await queryInterface.addConstraint("${a.tableName}", {
  type: "unique",
  name: "${a.unique.name}",
  fields: ${JSON.stringify(a.unique.columns)}
});`);
      otherDown.unshift(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.unique.name}");`
      );
    }

    if (a.kind === "dropUnique") {
      otherUp.push(
        `await queryInterface.removeConstraint("${a.tableName}", "${a.uniqueName}");`
      );
    }
  });

  const up = [
    ...createTables,
    ...addConstraints,
    ...addIndexes,
    ...otherUp,
  ].filter(Boolean);

  const down = [...dropConstraints, ...dropTables, ...otherDown].filter(
    Boolean
  );

  const content = `
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      ${up.length ? up.join("\n      ") : ""}
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      ${down.length ? down.join("\n      ") : ""}
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
`;

  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}
