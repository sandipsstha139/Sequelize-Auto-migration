import "reflect-metadata";

import fs from "fs";
import path from "path";
import { Sequelize } from "sequelize-typescript";
import {
  loadSeqmigConfig,
  loadSequelizeConfig,
} from "../loaders/config-loader";
import {
  CheckConstraintSchema,
  ColumnSchema,
  DatabaseSchema,
  ForeignKeySchema,
  IndexSchema,
  UniqueConstraintSchema,
} from "./schema-types";

function registerRuntime() {
  try {
    require("tsx/esm");
  } catch (e) {
    console.warn("tsx not found. Only JS will load.");
  }
}
function toScalar(db: string): any {
  const t = db.toUpperCase();
  if (t.includes("ARRAY")) return "ARRAY";
  if (t.startsWith("ENUM") || t.includes("ENUM(")) return "ENUM";
  if (t.includes("UUID")) return "UUID";
  if (t.includes("TIMESTAMP") || t.includes("DATE")) return "DATE";
  if (t.includes("BIGINT")) return "BIGINT";
  if (t.includes("INT")) return "INTEGER";
  if (t.includes("TEXT")) return "TEXT";
  if (t.includes("CHAR") || t.includes("STRING")) return "STRING";
  if (t.includes("BOOLEAN")) return "BOOLEAN";
  if (t.includes("JSONB")) return "JSONB";
  if (t.includes("JSON")) return "JSON";
  if (t.includes("DECIMAL")) return "DECIMAL";
  if (t.includes("FLOAT")) return "FLOAT";
  return "STRING";
}

function extractEnumValues(dbType: string): string[] | undefined {
  const upper = dbType.toUpperCase();
  if (!upper.startsWith("ENUM") && !upper.includes("ENUM(")) return undefined;

  const startIdx = dbType.indexOf("(");
  const endIdx = dbType.lastIndexOf(")");

  if (startIdx === -1 || endIdx === -1) return undefined;

  const inner = dbType.slice(startIdx + 1, endIdx);
  return inner.split(",").map((v) => v.trim().replace(/^["']+|["']+$/g, ""));
}

function isManyToManyJoinTable(
  tableName: string,
  columns: ColumnSchema[],
  foreignKeys: ForeignKeySchema[],
  indexes: IndexSchema[]
): boolean {
  if (foreignKeys.length < 2) return false;
  const fkColumns = foreignKeys.map((fk) => fk.column);
  const hasCompositeUnique = indexes.some((idx) => {
    if (!idx.unique) return false;
    const fkInIndex = idx.columns.filter((col) => fkColumns.includes(col));
    return fkInIndex.length >= 2;
  });
  return hasCompositeUnique;
}

function getAllModelFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    throw new Error(`Models directory not found: ${dir}`);
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllModelFiles(fullPath));
    } else if (
      (item.endsWith(".ts") || item.endsWith(".js")) &&
      !item.endsWith(".d.ts") &&
      item !== "index.ts" &&
      item !== "index.js"
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function introspect(): Promise<DatabaseSchema> {
  registerRuntime();

  const cfg = loadSequelizeConfig();
  const seqmigConfig = loadSeqmigConfig();

  const sequelize = new Sequelize({
    ...cfg,
    logging: false,
  });

  // Fix for sequelize-typescript require() issue
  (sequelize as any).import = (filePath: string) => {
    // Ensures .ts extension is included
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) {
      if (fs.existsSync(filePath + ".ts")) filePath = filePath + ".ts";
      if (fs.existsSync(filePath + ".js")) filePath = filePath + ".js";
    }

    return import(filePath);
  };

  const modelsPath = path.isAbsolute(seqmigConfig.modelsPath!)
    ? seqmigConfig.modelsPath!
    : path.join(process.cwd(), seqmigConfig.modelsPath!);

  const modelFiles = getAllModelFiles(modelsPath);
  // FIX: manually import model classes (ESM-compatible)
  const modelClasses = [];

  for (const file of modelFiles) {
    const mod = await import(file); // dynamic import works with .ts
    const modelClass = mod.default || Object.values(mod)[0];
    modelClasses.push(modelClass);
  }

  sequelize.addModels(modelClasses);

  await sequelize.authenticate();
  const schema: DatabaseSchema = { tables: [] };
  const models = sequelize.models;

  for (const [modelName, m] of Object.entries(models)) {
    const tableName = String(m.getTableName());
    const attrs = m.getAttributes();

    const columns: ColumnSchema[] = Object.entries(attrs).map(
      ([name, a]: any) => {
        const raw = a.type?.toString() || "STRING";

        const isArray =
          raw.toUpperCase().includes("ARRAY") ||
          (a.type && a.type.key === "ARRAY") ||
          (a.type && a.type.constructor && a.type.constructor.name === "ARRAY");

        const isEnum =
          raw.toUpperCase().includes("ENUM") ||
          (a.type && a.type.key === "ENUM") ||
          (a.type &&
            a.type.constructor &&
            a.type.constructor.name === "ENUM") ||
          (a.type && a.type.values && Array.isArray(a.type.values));

        let enumValues: string[] | undefined;
        if (isEnum) {
          if (a.type && a.type.values && Array.isArray(a.type.values)) {
            enumValues = a.type.values;
          } else {
            enumValues = extractEnumValues(raw);
          }
        }

        let defaultValue = a.defaultValue;
        let hasDefault = false;

        if (defaultValue !== null && defaultValue !== undefined) {
          const defaultStr = String(defaultValue);

          if (defaultStr.includes("::")) {
            const beforeTypeCast = defaultStr.split("::")[0].trim();

            if (
              beforeTypeCast.toUpperCase() === "NULL" ||
              beforeTypeCast === ""
            ) {
              defaultValue = null;
              hasDefault = false;
            } else {
              defaultValue = beforeTypeCast.replace(/^'(.*)'$/, "$1");
              hasDefault = true;
            }
          } else if (defaultStr === "undefined") {
            defaultValue = null;
            hasDefault = false;
          } else if (
            typeof defaultValue === "function" ||
            defaultStr === "[Function]" ||
            defaultStr.includes("function") ||
            defaultStr.includes("now()")
          ) {
            if (
              (name === "createdAt" || name === "updatedAt") &&
              (raw.toUpperCase().includes("DATE") ||
                raw.toUpperCase().includes("TIMESTAMP"))
            ) {
              hasDefault = true;
              defaultValue = "NOW";
            } else if (name === "id" && raw.toUpperCase().includes("UUID")) {
              hasDefault = true;
              defaultValue = "UUID_FUNCTION";
            } else {
              defaultValue = null;
              hasDefault = false;
            }
          } else {
            hasDefault = true;
          }
        }

        if (!hasDefault && (name === "createdAt" || name === "updatedAt")) {
          if (
            raw.toUpperCase().includes("DATE") ||
            raw.toUpperCase().includes("TIMESTAMP")
          ) {
            hasDefault = true;
            defaultValue = "NOW";
          }
        }

        if (defaultValue === undefined) {
          defaultValue = null;
          hasDefault = false;
        }

        const allowNull = a.allowNull === false ? false : true;

        const column: any = {
          name,
          type: isArray ? "ARRAY" : isEnum ? "ENUM" : toScalar(raw),
          dbType: raw,
          allowNull: allowNull,
          primaryKey: !!a.primaryKey,
          unique:
            !!a.unique || a.unique === true || typeof a.unique === "string",
          autoIncrement: !!a.autoIncrement,
          comment: a.comment || null,
          enumValues: enumValues,
        };

        if (hasDefault) {
          column.defaultValue = defaultValue;
        }

        return column;
      }
    );

    const primaryKeys = columns.filter((c) => c.primaryKey).map((c) => c.name);

    const rawIndexes: IndexSchema[] =
      (m as any).options.indexes?.map((idx: any) => ({
        name: idx.name,
        columns: idx.fields,
        unique: !!idx.unique,
        where: idx.where || null,
        type: idx.type || null,
        using: idx.using || null,
      })) || [];

    const uniques: UniqueConstraintSchema[] = [];
    const uniqueColumnNames = new Set<string>();
    const uniqueNameToColumns = new Map<string, string[]>();

    columns.forEach((col) => {
      if (col.unique && !col.primaryKey) {
        const attr = attrs[col.name];
        const uniqueValue = (attr as any).unique;

        let uniqueName: string;
        if (typeof uniqueValue === "string") {
          uniqueName = uniqueValue;
          if (!uniqueNameToColumns.has(uniqueName)) {
            uniqueNameToColumns.set(uniqueName, []);
          }
          uniqueNameToColumns.get(uniqueName)!.push(col.name);
        } else {
          uniqueName = `${tableName}_${col.name}_unique`;
          uniques.push({
            name: uniqueName,
            columns: [col.name],
          });
          uniqueColumnNames.add(col.name);
        }
      }
    });

    uniqueNameToColumns.forEach((cols, name) => {
      uniques.push({
        name,
        columns: cols,
      });
      cols.forEach((col) => uniqueColumnNames.add(col));
    });

    const uniqueKeys = ((m as any).options as any)?.uniqueKeys;
    if (uniqueKeys) {
      Object.entries(uniqueKeys).forEach(([name, cfg]: any) => {
        const isDuplicate = uniques.some(
          (u) =>
            u.name === name ||
            JSON.stringify(u.columns.sort()) ===
              JSON.stringify(cfg.fields.sort())
        );

        if (!isDuplicate) {
          uniques.push({ name, columns: cfg.fields });
          cfg.fields.forEach((field: string) => uniqueColumnNames.add(field));
        }
      });
    }

    rawIndexes.forEach((idx) => {
      if (idx.unique) {
        const isDuplicate = uniques.some(
          (u) =>
            u.name === idx.name ||
            JSON.stringify(u.columns.sort()) ===
              JSON.stringify(idx.columns.sort())
        );

        if (!isDuplicate) {
          uniques.push({
            name: idx.name,
            columns: idx.columns,
          });
          idx.columns.forEach((col) => uniqueColumnNames.add(col));
        }
      }
    });

    uniqueColumnNames.forEach((colName) => {
      const col = columns.find((c) => c.name === colName);
      if (col) {
        col.unique = false;
      }
    });

    const indexes = rawIndexes.filter((idx) => {
      if (idx.unique) return false;

      if (idx.columns.some((col) => uniqueColumnNames.has(col))) {
        return false;
      }

      return true;
    });

    const checks: CheckConstraintSchema[] = [];
    const validate = ((m as any).options as any)?.validate;
    if (validate) {
      Object.entries(validate).forEach(([name, expr]: any) => {
        if (typeof expr === "string") {
          checks.push({ name, expression: expr });
        }
      });
    }

    const foreignKeys: ForeignKeySchema[] = [];

    Object.values((m as any).associations).forEach((assoc: any) => {
      if (assoc.associationType === "BelongsTo") {
        const fk = assoc.foreignKey;
        const col = columns.find((c) => c.name === fk);
        if (col) col.unique = false;

        foreignKeys.push({
          name: assoc.options?.constraintName || `${tableName}_${fk}_fkey`,
          column: fk,
          referencedTable: assoc.target.getTableName(),
          referencedColumn: assoc.target.primaryKeyAttribute,
          onDelete: assoc.options?.onDelete || "CASCADE",
          onUpdate: assoc.options?.onUpdate || "CASCADE",
        });
      }
    });

    const isJoinTable = isManyToManyJoinTable(
      tableName,
      columns,
      foreignKeys,
      indexes
    );

    if (isJoinTable) {
      const fkColumns = foreignKeys.map((fk) => fk.column);
      const mainFKs = fkColumns.slice(0, 2);

      const hasUniqueConstraint = uniques.some((u) => {
        const sortedU = [...u.columns].sort();
        const sortedFK = [...mainFKs].sort();
        return (
          sortedU.length === sortedFK.length &&
          sortedU.every((col, i) => col === sortedFK[i])
        );
      });

      if (!hasUniqueConstraint) {
        const constraintName = `${tableName}_${mainFKs.join("_")}_uq`;
        uniques.push({
          name: constraintName,
          columns: mainFKs,
        });
      }

      fkColumns.forEach((fkCol) => {
        const col = columns.find((c) => c.name === fkCol);
        if (col) col.unique = false;
      });
    }

    schema.tables.push({
      name: tableName,
      columns,
      indexes,
      foreignKeys,
      uniques,
      checks,
      primaryKeys,
    });
  }

  return schema;
}
