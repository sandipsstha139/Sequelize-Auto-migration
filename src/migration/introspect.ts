import "reflect-metadata";
import { Model, ModelCtor } from "sequelize-typescript";
import { sequelize } from "../config/sequelize";
import {
  ColumnSchema,
  DatabaseSchema,
  ForeignKeySchema,
  IndexSchema,
  UniqueConstraintSchema,
} from "./schema-types";

function toScalar(db: string): any {
  const t = db.toUpperCase();

  if (t.startsWith("ENUM(")) return "ENUM";
  if (t.includes("UUID")) return "UUID";
  if (t.includes("TIMESTAMP") || t.includes("DATE")) return "DATE";
  if (t.includes("BIGINT")) return "BIGINT";
  if (t.includes("INT")) return "INTEGER";
  if (t.includes("TEXT")) return "TEXT";
  if (t.includes("CHAR") || t.includes("STRING")) return "STRING";
  if (t.includes("BOOLEAN")) return "BOOLEAN";
  if (t.includes("JSON")) return "JSON";
  if (t.includes("DECIMAL")) return "DECIMAL";
  if (t.includes("FLOAT") || t.includes("REAL")) return "FLOAT";

  return "STRING";
}

export async function introspect(): Promise<DatabaseSchema> {
  await sequelize.authenticate();

  const schema: DatabaseSchema = { tables: [], enums: {} };
  const models = sequelize.modelManager.models as ModelCtor<Model>[];

  for (const m of models) {
    const tableName = String(m.getTableName());
    const attrs = m.getAttributes();

    const columns: ColumnSchema[] = Object.entries(attrs).map(
      ([name, a]: any) => {
        const raw = a.type?.toString()?.toUpperCase() || "STRING";
        const mapped = toScalar(raw);

        return {
          name,
          type: mapped,
          dbType: raw,
          allowNull: a.allowNull ?? true,
          defaultValue: a.defaultValue ?? null,
          primaryKey: !!a.primaryKey,
          unique: !!a.unique,
        };
      }
    );

    const indexes: IndexSchema[] =
      (m.options.indexes || []).map((idx: any) => ({
        name: idx.name,
        columns: idx.fields,
        unique: !!idx.unique,
      })) || [];

    const foreignKeys: ForeignKeySchema[] = [];

    Object.values(m.associations).forEach((assoc: any) => {
      if (assoc.associationType === "BelongsTo") {
        foreignKeys.push({
          name:
            assoc.options?.constraintName ||
            `${tableName}_${assoc.foreignKey}_fkey`,
          column: assoc.foreignKey,
          referencedTable: assoc.target.getTableName(),
          referencedColumn: assoc.targetKey || "id",
          onDelete: assoc.options?.onDelete || null,
          onUpdate: assoc.options?.onUpdate || null,
        });
      }
    });

    const uniques: UniqueConstraintSchema[] = [];
    const uniqueKeys = (m.options as any)?.uniqueKeys;

    if (uniqueKeys) {
      Object.entries(uniqueKeys).forEach(([name, cfg]: any) => {
        uniques.push({
          name,
          columns: cfg.fields,
        });
      });
    }

    const tableEnums: Record<string, string[]> = {};
    columns.forEach((c) => {
      if (c.dbType.startsWith("ENUM(")) {
        const enumName = `${tableName}_${c.name}_enum`;
        const vals = c.dbType
          .replace("ENUM(", "")
          .replace(")", "")
          .split(",")
          .map((v) => v.trim().replace(/'/g, ""));
        tableEnums[enumName] = vals;
      }
    });

    schema.enums = { ...schema.enums, ...tableEnums };

    schema.tables.push({
      name: tableName,
      columns,
      indexes,
      foreignKeys,
      uniques,
    });
  }

  return schema;
}
