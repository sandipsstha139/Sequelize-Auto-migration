import "reflect-metadata";
import { Model, ModelCtor } from "sequelize-typescript";
import { sequelize } from "../config/sequelize";
import {
  ColumnSchema,
  DatabaseSchema,
  ForeignKeySchema,
  IndexSchema,
  ScalarType,
  TableSchema,
} from "./schema-types";

function mapSequelizeTypeToScalar(type: any): {
  scalar: ScalarType;
  dbType: string;
} {
  const s = type?.key || type?.toSql?.() || type?.toString?.() || "UNKNOWN";

  const normalized = String(s).toUpperCase();

  if (normalized.includes("ENUM")) {
    return { scalar: "enum", dbType: normalized };
  }
  if (normalized.includes("UUID")) {
    return { scalar: "uuid", dbType: normalized };
  }
  if (
    normalized.includes("CHAR") ||
    normalized.includes("TEXT") ||
    normalized.includes("STRING")
  ) {
    return { scalar: "string", dbType: normalized };
  }
  if (normalized.includes("INT")) {
    return { scalar: "integer", dbType: normalized };
  }
  if (normalized.includes("BIGINT")) {
    return { scalar: "bigint", dbType: normalized };
  }
  if (normalized.includes("BOOL")) {
    return { scalar: "boolean", dbType: normalized };
  }
  if (normalized.includes("DATE")) {
    return { scalar: "dateTime", dbType: normalized };
  }
  if (normalized.includes("FLOAT") || normalized.includes("REAL")) {
    return { scalar: "float", dbType: normalized };
  }
  if (normalized.includes("DECIMAL")) {
    return { scalar: "decimal", dbType: normalized };
  }
  if (normalized.includes("JSON")) {
    return { scalar: "json", dbType: normalized };
  }

  return { scalar: "string", dbType: normalized };
}

function extractEnumValues(dbType: string): string[] | null {
  // crude but works for ENUM('A','B','C')
  const match = dbType.match(/ENUM\s*\((.+)\)/i);
  if (!match) return null;
  return match[1]
    .split(",")
    .map((v) => v.trim())
    .map((v) => v.replace(/^'(.*)'$/, "$1"));
}

function getTableSchemaFromModel(model: ModelCtor<Model>): TableSchema {
  const tableName = model.getTableName() as string;

  const attrs = model.getAttributes();

  const columns: ColumnSchema[] = Object.entries(attrs).map(
    ([name, attr]: any) => {
      const { scalar, dbType } = mapSequelizeTypeToScalar(attr.type);

      return {
        name,
        type: scalar,
        dbType,
        allowNull: attr.allowNull ?? true,
        defaultValue: attr.defaultValue ?? null,
        primaryKey: !!attr.primaryKey,
        unique: !!attr.unique,
      };
    }
  );

  // indexes from model options
  const indexes: IndexSchema[] =
    (model.options as any).indexes?.map((idx: any, idxIndex: number) => ({
      name: idx.name || `${tableName}_${idxIndex}`,
      columns: idx.fields || [],
      unique: !!idx.unique,
    })) || [];

  // foreign keys from associations
  const foreignKeys: ForeignKeySchema[] = [];
  Object.entries(model.associations).forEach(([name, assoc]) => {
    const anyAssoc = assoc as any;
    // Now your logic:
    if (
      anyAssoc.associationType === "BelongsTo" ||
      anyAssoc.associationType === "HasOne" ||
      anyAssoc.associationType === "HasMany"
    ) {
      foreignKeys.push({
        name:
          anyAssoc.options?.constraintName ||
          `${tableName}_${String(anyAssoc.foreignKey)}_fkey`,
        column: String(anyAssoc.foreignKey),
        referencedTable: anyAssoc.target.getTableName(),
        referencedColumn: anyAssoc.targetKey || "id",
        onUpdate: anyAssoc.options?.onUpdate || null,
        onDelete: anyAssoc.options?.onDelete || null,
      });
    }
  });

  return {
    name: tableName,
    columns,
    indexes,
    foreignKeys,
  };
}

export async function introspectDatabaseSchema(): Promise<DatabaseSchema> {
  await sequelize.authenticate();

  // force loading models from glob if not already loaded
  // (sequelize.ts already did models: [...glob])

  const schema: DatabaseSchema = {
    tables: [],
    enums: {},
  };

  const models = sequelize.modelManager.models as ModelCtor<Model>[];

  for (const m of models) {
    const table = getTableSchemaFromModel(m);
    schema.tables.push(table);

    // extract enums from columns
    for (const col of table.columns) {
      if (col.type === "enum") {
        const values = extractEnumValues(col.dbType);
        if (values) {
          const enumName = `${table.name}_${col.name}_enum`;
          schema.enums[enumName] = values;
        }
      }
    }
  }

  return schema;
}
