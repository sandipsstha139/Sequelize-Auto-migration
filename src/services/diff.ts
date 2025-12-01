import { DatabaseSchema, MigrationAction } from "./schema-types";

function same(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function columnSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[_-]/g, "");
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;

  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;

  if (longer.includes(shorter)) return 0.8;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

function detectRenames(
  beforeCols: any[],
  afterCols: any[],
  getName: (x: any) => string
): Map<string, string> {
  const renames = new Map<string, string>();
  const droppedCols = beforeCols.filter(
    (b) => !afterCols.find((a) => getName(a) === getName(b))
  );
  const addedCols = afterCols.filter(
    (a) => !beforeCols.find((b) => getName(b) === getName(a))
  );

  for (const dropped of droppedCols) {
    let bestMatch = null;
    let bestScore = 0.7;

    for (const added of addedCols) {
      if (renames.has(getName(added))) continue;

      const score = columnSimilarity(getName(dropped), getName(added));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = added;
      }
    }

    if (bestMatch) {
      renames.set(getName(dropped), getName(bestMatch));
    }
  }

  return renames;
}

function sortByDependencies(actions: MigrationAction[]): MigrationAction[] {
  const createTables = actions.filter((a) => a.kind === "createTable");
  const dropFKs = actions.filter((a) => a.kind === "dropFK");
  const addFKs = actions.filter((a) => a.kind === "addFK");
  const dropTables = actions.filter((a) => a.kind === "dropTable");
  const rest = actions.filter(
    (a) =>
      a.kind !== "createTable" &&
      a.kind !== "dropFK" &&
      a.kind !== "addFK" &&
      a.kind !== "dropTable"
  );

  return [...dropFKs, ...createTables, ...rest, ...addFKs, ...dropTables];
}

function getUniqueColumns(uniques: any[]): Set<string> {
  const uniqueCols = new Set<string>();
  uniques.forEach((u) => {
    if (u.columns.length === 1) {
      uniqueCols.add(u.columns[0]);
    }
  });
  return uniqueCols;
}

function filterRedundantIndexes(indexes: any[], uniques: any[]): any[] {
  const uniqueCols = getUniqueColumns(uniques);

  return indexes.filter((idx) => {
    if (idx.unique) return false;

    if (idx.columns.length === 1 && uniqueCols.has(idx.columns[0])) {
      return false;
    }

    return true;
  });
}

export function diff(
  before: DatabaseSchema,
  after: DatabaseSchema
): MigrationAction[] {
  const out: MigrationAction[] = [];

  after.tables.forEach((t) => {
    if (!before.tables.find((x) => x.name === t.name)) {
      out.push({ kind: "createTable", table: t });
    }
  });

  before.tables.forEach((t) => {
    if (!after.tables.find((x) => x.name === t.name)) {
      out.push({ kind: "dropTable", tableName: t.name, backup: t });
    }
  });

  after.tables.forEach((t) => {
    const prev = before.tables.find((x) => x.name === t.name);
    if (!prev) return;

    const colRenames = detectRenames(prev.columns, t.columns, (c) => c.name);

    colRenames.forEach((newName, oldName) => {
      out.push({
        kind: "renameColumn",
        tableName: t.name,
        oldName,
        newName,
      });
    });

    t.columns.forEach((c) => {
      const p = prev.columns.find((x) => x.name === c.name);
      const renamedFrom = Array.from(colRenames.entries()).find(
        ([_, newN]) => newN === c.name
      );

      if (renamedFrom) {
        const oldCol = prev.columns.find((x) => x.name === renamedFrom[0]);
        if (oldCol && !same(oldCol, { ...c, name: oldCol.name })) {
          out.push({
            kind: "alterColumn",
            tableName: t.name,
            before: oldCol,
            after: c,
          });
        }
      } else if (!p) {
        out.push({ kind: "addColumn", tableName: t.name, column: c });
      } else if (!same(p, c)) {
        out.push({
          kind: "alterColumn",
          tableName: t.name,
          before: p,
          after: c,
        });
      }
    });

    prev.columns.forEach((c) => {
      const isRenamed = colRenames.has(c.name);
      if (!t.columns.find((x) => x.name === c.name) && !isRenamed) {
        out.push({
          kind: "dropColumn",
          tableName: t.name,
          columnName: c.name,
          backup: c,
        });
      }
    });

    if (!same(prev.primaryKeys, t.primaryKeys)) {
      out.push({
        kind: "changePrimaryKey",
        tableName: t.name,
        before: prev.primaryKeys,
        after: t.primaryKeys,
      });
    }

    const filteredPrevIndexes = filterRedundantIndexes(
      prev.indexes,
      prev.uniques
    );
    const filteredAfterIndexes = filterRedundantIndexes(t.indexes, t.uniques);

    filteredAfterIndexes.forEach((i) => {
      const p = filteredPrevIndexes.find((x) => x.name === i.name);
      if (!p) out.push({ kind: "createIndex", tableName: t.name, index: i });
      else if (!same(p, i)) {
        out.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: i.name,
          backup: p,
        });
        out.push({ kind: "createIndex", tableName: t.name, index: i });
      }
    });

    filteredPrevIndexes.forEach((i) => {
      if (!filteredAfterIndexes.find((x) => x.name === i.name)) {
        out.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: i.name,
          backup: i,
        });
      }
    });

    t.foreignKeys.forEach((fk) => {
      const p = prev.foreignKeys.find((x) => x.name === fk.name);
      if (!p) out.push({ kind: "addFK", tableName: t.name, fk });
      else if (!same(p, fk)) {
        out.push({
          kind: "dropFK",
          tableName: t.name,
          fkName: p.name,
          backup: p,
        });
        out.push({ kind: "addFK", tableName: t.name, fk });
      }
    });

    prev.foreignKeys.forEach((fk) => {
      if (!t.foreignKeys.find((x) => x.name === fk.name)) {
        out.push({
          kind: "dropFK",
          tableName: t.name,
          fkName: fk.name,
          backup: fk,
        });
      }
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
          backup: old,
        });
        out.push({ kind: "addUnique", tableName: t.name, unique: u });
      }
    });

    beforeUnique.forEach((u) => {
      if (!afterUnique.find((x) => x.name === u.name)) {
        out.push({
          kind: "dropUnique",
          tableName: t.name,
          uniqueName: u.name,
          backup: u,
        });
      }
    });

    const beforeChecks = prev.checks || [];
    const afterChecks = t.checks || [];

    afterChecks.forEach((ch) => {
      const old = beforeChecks.find((x) => x.name === ch.name);
      if (!old) out.push({ kind: "addCheck", tableName: t.name, check: ch });
      else if (!same(old, ch)) {
        out.push({
          kind: "dropCheck",
          tableName: t.name,
          checkName: old.name,
          backup: old,
        });
        out.push({ kind: "addCheck", tableName: t.name, check: ch });
      }
    });

    beforeChecks.forEach((ch) => {
      if (!afterChecks.find((x) => x.name === ch.name)) {
        out.push({
          kind: "dropCheck",
          tableName: t.name,
          checkName: ch.name,
          backup: ch,
        });
      }
    });
  });

  return sortByDependencies(out);
}
