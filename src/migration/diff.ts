import { DatabaseSchema, MigrationAction } from "./schema-types";

function same(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diff(
  before: DatabaseSchema,
  after: DatabaseSchema
): MigrationAction[] {
  const out: MigrationAction[] = [];

  after.tables.forEach((t) => {
    if (!before.tables.find((x) => x.name === t.name))
      out.push({ kind: "createTable", table: t });
  });

  before.tables.forEach((t) => {
    if (!after.tables.find((x) => x.name === t.name))
      out.push({ kind: "dropTable", tableName: t.name });
  });

  after.tables.forEach((t) => {
    const prev = before.tables.find((x) => x.name === t.name);
    if (!prev) return;

    t.columns.forEach((c) => {
      const p = prev.columns.find((x) => x.name === c.name);
      if (!p) out.push({ kind: "addColumn", tableName: t.name, column: c });
      else if (!same(p, c))
        out.push({
          kind: "alterColumn",
          tableName: t.name,
          before: p,
          after: c,
        });
    });

    prev.columns.forEach((c) => {
      if (!t.columns.find((x) => x.name === c.name))
        out.push({ kind: "dropColumn", tableName: t.name, columnName: c.name });
    });

    t.indexes.forEach((i) => {
      const p = prev.indexes.find((x) => x.name === i.name);
      if (!p) out.push({ kind: "createIndex", tableName: t.name, index: i });
      else if (!same(p, i)) {
        out.push({ kind: "dropIndex", tableName: t.name, indexName: i.name });
        out.push({ kind: "createIndex", tableName: t.name, index: i });
      }
    });

    prev.indexes.forEach((i) => {
      if (!t.indexes.find((x) => x.name === i.name))
        out.push({ kind: "dropIndex", tableName: t.name, indexName: i.name });
    });

    t.foreignKeys.forEach((fk) => {
      const p = prev.foreignKeys.find((x) => x.name === fk.name);
      if (!p) out.push({ kind: "addFK", tableName: t.name, fk });
      else if (!same(p, fk)) {
        out.push({ kind: "dropFK", tableName: t.name, fkName: p.name });
        out.push({ kind: "addFK", tableName: t.name, fk });
      }
    });

    prev.foreignKeys.forEach((fk) => {
      if (!t.foreignKeys.find((x) => x.name === fk.name))
        out.push({ kind: "dropFK", tableName: t.name, fkName: fk.name });
    });

    const beforeUnique = prev.uniques || [];
    const afterUnique = t.uniques || [];

    afterUnique.forEach((u) => {
      const old = beforeUnique.find((x) => x.name === u.name);
      if (!old) out.push({ kind: "addUnique", tableName: t.name, unique: u });
      else if (!same(old.columns, u.columns)) {
        out.push({
          kind: "dropUnique",
          tableName: t.name,
          uniqueName: old.name,
        });
        out.push({ kind: "addUnique", tableName: t.name, unique: u });
      }
    });

    beforeUnique.forEach((u) => {
      if (!afterUnique.find((x) => x.name === u.name))
        out.push({ kind: "dropUnique", tableName: t.name, uniqueName: u.name });
    });
  });

  Object.entries(after.enums).forEach(([name, values]) => {
    const beforeVals = before.enums[name];
    if (!beforeVals) out.push({ kind: "createEnum", enum: { name, values } });
    else if (!same(beforeVals, values))
      out.push({
        kind: "alterEnum",
        before: { name, values: beforeVals },
        after: { name, values },
      });
  });

  Object.keys(before.enums).forEach((name) => {
    if (!after.enums[name]) out.push({ kind: "dropEnum", enumName: name });
  });

  return out;
}
