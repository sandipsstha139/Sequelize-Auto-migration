import {
  ColumnSchema,
  DatabaseSchema,
  ForeignKeySchema,
  IndexSchema,
  MigrationAction,
} from "./schema-types";

function byName<T extends { name: string }>(
  arr: T[],
  name: string
): T | undefined {
  return arr.find((x) => x.name === name);
}

function columnEquals(a: ColumnSchema, b: ColumnSchema): boolean {
  return (
    a.type === b.type &&
    a.dbType === b.dbType &&
    a.allowNull === b.allowNull &&
    String(a.defaultValue ?? null) === String(b.defaultValue ?? null) &&
    a.primaryKey === b.primaryKey &&
    a.unique === b.unique
  );
}

function indexEquals(a: IndexSchema, b: IndexSchema): boolean {
  if (a.unique !== b.unique) return false;
  if (a.columns.length !== b.columns.length) return false;
  return a.columns.every((c, i) => c === b.columns[i]);
}

function fkEquals(a: ForeignKeySchema, b: ForeignKeySchema): boolean {
  return (
    a.column === b.column &&
    a.referencedTable === b.referencedTable &&
    a.referencedColumn === b.referencedColumn &&
    (a.onDelete || null) === (b.onDelete || null) &&
    (a.onUpdate || null) === (b.onUpdate || null)
  );
}

export function diffSchemas(
  before: DatabaseSchema,
  after: DatabaseSchema
): MigrationAction[] {
  const actions: MigrationAction[] = [];

  // Enums
  const beforeEnums = before.enums || {};
  const afterEnums = after.enums || {};

  for (const name of Object.keys(afterEnums)) {
    if (!beforeEnums[name]) {
      actions.push({ kind: "createEnum", name, values: afterEnums[name] });
    } else {
      const bVals = beforeEnums[name];
      const aVals = afterEnums[name];
      if (JSON.stringify(bVals) !== JSON.stringify(aVals)) {
        actions.push({ kind: "alterEnum", name, before: bVals, after: aVals });
      }
    }
  }

  for (const name of Object.keys(beforeEnums)) {
    if (!afterEnums[name]) {
      actions.push({ kind: "dropEnum", name });
    }
  }

  // Tables
  const beforeTables = before.tables || [];
  const afterTables = after.tables || [];

  // new tables
  for (const t of afterTables) {
    if (!byName(beforeTables, t.name)) {
      actions.push({ kind: "createTable", table: t });
    }
  }

  // dropped tables
  for (const t of beforeTables) {
    if (!byName(afterTables, t.name)) {
      actions.push({ kind: "dropTable", tableName: t.name });
    }
  }

  // existing tables: columns, indexes, FKs
  for (const t of afterTables) {
    const old = byName(beforeTables, t.name);
    if (!old) continue;

    // columns
    for (const col of t.columns) {
      const prev = old.columns.find((c) => c.name === col.name);
      if (!prev) {
        actions.push({
          kind: "addColumn",
          tableName: t.name,
          column: col,
        });
      } else if (!columnEquals(prev, col)) {
        actions.push({
          kind: "alterColumn",
          tableName: t.name,
          before: prev,
          after: col,
        });
      }
    }

    for (const col of old.columns) {
      if (!t.columns.find((c) => c.name === col.name)) {
        actions.push({
          kind: "dropColumn",
          tableName: t.name,
          columnName: col.name,
        });
      }
    }

    // indexes
    for (const idx of t.indexes) {
      const prev = old.indexes.find((x) => x.name === idx.name);
      if (!prev) {
        actions.push({
          kind: "createIndex",
          tableName: t.name,
          index: idx,
        });
      } else if (!indexEquals(prev, idx)) {
        actions.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: prev.name,
        });
        actions.push({
          kind: "createIndex",
          tableName: t.name,
          index: idx,
        });
      }
    }

    for (const idx of old.indexes) {
      if (!t.indexes.find((x) => x.name === idx.name)) {
        actions.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: idx.name,
        });
      }
    }

    // foreign keys
    for (const fk of t.foreignKeys) {
      const prev = old.foreignKeys.find((x) => x.name === fk.name);
      if (!prev) {
        actions.push({
          kind: "addForeignKey",
          tableName: t.name,
          fk,
        });
      } else if (!fkEquals(prev, fk)) {
        actions.push({
          kind: "dropForeignKey",
          tableName: t.name,
          fkName: prev.name,
        });
        actions.push({
          kind: "addForeignKey",
          tableName: t.name,
          fk,
        });
      }
    }

    for (const fk of old.foreignKeys) {
      if (!t.foreignKeys.find((x) => x.name === fk.name)) {
        actions.push({
          kind: "dropForeignKey",
          tableName: t.name,
          fkName: fk.name,
        });
      }
    }
  }

  return actions;
}
