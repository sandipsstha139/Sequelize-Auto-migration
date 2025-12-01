#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  runCli: () => runCli
});
module.exports = __toCommonJS(src_exports);
var import_commander = require("commander");

// package.json
var version = "1.0.0";

// src/loaders/config-loader.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
function loadSeqmigConfig() {
  const rcPath = import_path.default.join(process.cwd(), ".sequelizerc");
  let rc = {};
  if (import_fs.default.existsSync(rcPath)) {
    rc = require(rcPath) ?? {};
  }
  const resolve = /* @__PURE__ */ __name((p, fallback) => !p ? import_path.default.resolve(fallback) : import_path.default.isAbsolute(p) ? p : import_path.default.resolve(process.cwd(), p), "resolve");
  return {
    configFile: resolve(rc.config, "config/config.js"),
    modelsPath: resolve(rc["models-path"], "models"),
    migrationDir: resolve(rc["migrations-path"], "migrations"),
    seedersPath: resolve(rc["seeders-path"], "seeders"),
    snapshotDir: import_path.default.resolve(".seqmig/snapshots"),
    url: rc.url,
    debug: rc.debug,
    tsconfigPath: rc["tsconfig-path"]
  };
}
__name(loadSeqmigConfig, "loadSeqmigConfig");
function loadSequelizeConfig() {
  const cfg = loadSeqmigConfig();
  if (cfg.url) {
    return {
      url: cfg.url,
      dialect: "postgres",
      logging: false
    };
  }
  const configPath = cfg.configFile;
  if (!import_fs.default.existsSync(configPath)) {
    throw new Error(`Sequelize config file not found: ${configPath}`);
  }
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  const env = process.env.NODE_ENV || "development";
  const db = config[env] || config;
  if (!db.username) throw new Error(`Missing username in Sequelize config`);
  if (!db.database) throw new Error(`Missing database in Sequelize config`);
  if (!db.host) throw new Error(`Missing host in Sequelize config`);
  return {
    username: String(db.username),
    password: db.password ? String(db.password) : "",
    database: String(db.database),
    host: String(db.host),
    port: Number(db.port || 5432),
    dialect: db.dialect || "postgres",
    logging: false
  };
}
__name(loadSequelizeConfig, "loadSequelizeConfig");
function initConfig() {
  const rcPath = import_path.default.join(process.cwd(), ".sequelizerc");
  if (import_fs.default.existsSync(rcPath)) {
    console.log(".sequelizerc already exists");
    return;
  }
  const template = `
const path = require("path");

module.exports = {
  config: path.resolve("config/config.js"),
  "models-path": path.resolve("models"),
  "migrations-path": path.resolve("migrations"),
  "seeders-path": path.resolve("seeders")
};
`.trimStart();
  import_fs.default.writeFileSync(rcPath, template);
  console.log("Created .sequelizerc");
}
__name(initConfig, "initConfig");

// src/services/introspect.ts
var import_reflect_metadata = require("reflect-metadata");
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_sequelize_typescript = require("sequelize-typescript");
function registerRuntime() {
  try {
    require("tsx/esm");
  } catch (e) {
    console.warn("tsx not found. Only JS will load.");
  }
}
__name(registerRuntime, "registerRuntime");
function toScalar(db) {
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
__name(toScalar, "toScalar");
function extractEnumValues(dbType) {
  const upper = dbType.toUpperCase();
  if (!upper.startsWith("ENUM") && !upper.includes("ENUM(")) return void 0;
  const startIdx = dbType.indexOf("(");
  const endIdx = dbType.lastIndexOf(")");
  if (startIdx === -1 || endIdx === -1) return void 0;
  const inner = dbType.slice(startIdx + 1, endIdx);
  return inner.split(",").map((v) => v.trim().replace(/^["']+|["']+$/g, ""));
}
__name(extractEnumValues, "extractEnumValues");
function isManyToManyJoinTable(tableName, columns, foreignKeys, indexes) {
  if (foreignKeys.length < 2) return false;
  const fkColumns = foreignKeys.map((fk) => fk.column);
  const hasCompositeUnique = indexes.some((idx) => {
    if (!idx.unique) return false;
    const fkInIndex = idx.columns.filter((col2) => fkColumns.includes(col2));
    return fkInIndex.length >= 2;
  });
  return hasCompositeUnique;
}
__name(isManyToManyJoinTable, "isManyToManyJoinTable");
function getAllModelFiles(dir) {
  const files = [];
  if (!import_fs2.default.existsSync(dir)) {
    throw new Error(`Models directory not found: ${dir}`);
  }
  const items = import_fs2.default.readdirSync(dir);
  for (const item of items) {
    const fullPath = import_path2.default.join(dir, item);
    const stat = import_fs2.default.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllModelFiles(fullPath));
    } else if ((item.endsWith(".ts") || item.endsWith(".js")) && !item.endsWith(".d.ts") && item !== "index.ts" && item !== "index.js") {
      files.push(fullPath);
    }
  }
  return files;
}
__name(getAllModelFiles, "getAllModelFiles");
async function introspect() {
  registerRuntime();
  const cfg = loadSequelizeConfig();
  const seqmigConfig = loadSeqmigConfig();
  const sequelize = new import_sequelize_typescript.Sequelize({
    ...cfg,
    logging: false
  });
  sequelize.import = (filePath) => {
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) {
      if (import_fs2.default.existsSync(filePath + ".ts")) filePath = filePath + ".ts";
      if (import_fs2.default.existsSync(filePath + ".js")) filePath = filePath + ".js";
    }
    return import(filePath);
  };
  const modelsPath = import_path2.default.isAbsolute(seqmigConfig.modelsPath) ? seqmigConfig.modelsPath : import_path2.default.join(process.cwd(), seqmigConfig.modelsPath);
  const modelFiles = getAllModelFiles(modelsPath);
  const modelClasses = [];
  for (const file of modelFiles) {
    const mod = await import(file);
    const modelClass = mod.default || Object.values(mod)[0];
    modelClasses.push(modelClass);
  }
  sequelize.addModels(modelClasses);
  await sequelize.authenticate();
  const schema = {
    tables: []
  };
  const models = sequelize.models;
  for (const [modelName, m] of Object.entries(models)) {
    const tableName = String(m.getTableName());
    const attrs = m.getAttributes();
    const columns = Object.entries(attrs).map(([name, a]) => {
      const raw = a.type?.toString() || "STRING";
      const isArray = raw.toUpperCase().includes("ARRAY") || a.type && a.type.key === "ARRAY" || a.type && a.type.constructor && a.type.constructor.name === "ARRAY";
      const isEnum = raw.toUpperCase().includes("ENUM") || a.type && a.type.key === "ENUM" || a.type && a.type.constructor && a.type.constructor.name === "ENUM" || a.type && a.type.values && Array.isArray(a.type.values);
      let enumValues;
      if (isEnum) {
        if (a.type && a.type.values && Array.isArray(a.type.values)) {
          enumValues = a.type.values;
        } else {
          enumValues = extractEnumValues(raw);
        }
      }
      let defaultValue = a.defaultValue;
      let hasDefault = false;
      if (defaultValue !== null && defaultValue !== void 0) {
        const defaultStr = String(defaultValue);
        if (defaultStr.includes("::")) {
          const beforeTypeCast = defaultStr.split("::")[0].trim();
          if (beforeTypeCast.toUpperCase() === "NULL" || beforeTypeCast === "") {
            defaultValue = null;
            hasDefault = false;
          } else {
            defaultValue = beforeTypeCast.replace(/^'(.*)'$/, "$1");
            hasDefault = true;
          }
        } else if (defaultStr === "undefined") {
          defaultValue = null;
          hasDefault = false;
        } else if (typeof defaultValue === "function" || defaultStr === "[Function]" || defaultStr.includes("function") || defaultStr.includes("now()")) {
          if ((name === "createdAt" || name === "updatedAt") && (raw.toUpperCase().includes("DATE") || raw.toUpperCase().includes("TIMESTAMP"))) {
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
        if (raw.toUpperCase().includes("DATE") || raw.toUpperCase().includes("TIMESTAMP")) {
          hasDefault = true;
          defaultValue = "NOW";
        }
      }
      if (defaultValue === void 0) {
        defaultValue = null;
        hasDefault = false;
      }
      const allowNull = a.allowNull === false ? false : true;
      const column = {
        name,
        type: isArray ? "ARRAY" : isEnum ? "ENUM" : toScalar(raw),
        dbType: raw,
        allowNull,
        primaryKey: !!a.primaryKey,
        unique: !!a.unique || a.unique === true || typeof a.unique === "string",
        autoIncrement: !!a.autoIncrement,
        comment: a.comment || null,
        enumValues
      };
      if (hasDefault) {
        column.defaultValue = defaultValue;
      }
      return column;
    });
    const primaryKeys = columns.filter((c) => c.primaryKey).map((c) => c.name);
    const rawIndexes = m.options.indexes?.map((idx) => ({
      name: idx.name,
      columns: idx.fields,
      unique: !!idx.unique,
      where: idx.where || null,
      type: idx.type || null,
      using: idx.using || null
    })) || [];
    const uniques = [];
    const uniqueColumnNames = /* @__PURE__ */ new Set();
    const uniqueNameToColumns = /* @__PURE__ */ new Map();
    columns.forEach((col2) => {
      if (col2.unique && !col2.primaryKey) {
        const attr = attrs[col2.name];
        const uniqueValue = attr.unique;
        let uniqueName;
        if (typeof uniqueValue === "string") {
          uniqueName = uniqueValue;
          if (!uniqueNameToColumns.has(uniqueName)) {
            uniqueNameToColumns.set(uniqueName, []);
          }
          uniqueNameToColumns.get(uniqueName).push(col2.name);
        } else {
          uniqueName = `${tableName}_${col2.name}_unique`;
          uniques.push({
            name: uniqueName,
            columns: [
              col2.name
            ]
          });
          uniqueColumnNames.add(col2.name);
        }
      }
    });
    uniqueNameToColumns.forEach((cols, name) => {
      uniques.push({
        name,
        columns: cols
      });
      cols.forEach((col2) => uniqueColumnNames.add(col2));
    });
    const uniqueKeys = m.options?.uniqueKeys;
    if (uniqueKeys) {
      Object.entries(uniqueKeys).forEach(([name, cfg2]) => {
        const isDuplicate = uniques.some((u) => u.name === name || JSON.stringify(u.columns.sort()) === JSON.stringify(cfg2.fields.sort()));
        if (!isDuplicate) {
          uniques.push({
            name,
            columns: cfg2.fields
          });
          cfg2.fields.forEach((field) => uniqueColumnNames.add(field));
        }
      });
    }
    rawIndexes.forEach((idx) => {
      if (idx.unique) {
        const isDuplicate = uniques.some((u) => u.name === idx.name || JSON.stringify(u.columns.sort()) === JSON.stringify(idx.columns.sort()));
        if (!isDuplicate) {
          uniques.push({
            name: idx.name,
            columns: idx.columns
          });
          idx.columns.forEach((col2) => uniqueColumnNames.add(col2));
        }
      }
    });
    uniqueColumnNames.forEach((colName) => {
      const col2 = columns.find((c) => c.name === colName);
      if (col2) {
        col2.unique = false;
      }
    });
    const indexes = rawIndexes.filter((idx) => {
      if (idx.unique) return false;
      if (idx.columns.some((col2) => uniqueColumnNames.has(col2))) {
        return false;
      }
      return true;
    });
    const checks = [];
    const validate = m.options?.validate;
    if (validate) {
      Object.entries(validate).forEach(([name, expr]) => {
        if (typeof expr === "string") {
          checks.push({
            name,
            expression: expr
          });
        }
      });
    }
    const foreignKeys = [];
    Object.values(m.associations).forEach((assoc) => {
      if (assoc.associationType === "BelongsTo") {
        const fk = assoc.foreignKey;
        const col2 = columns.find((c) => c.name === fk);
        if (col2) col2.unique = false;
        foreignKeys.push({
          name: assoc.options?.constraintName || `${tableName}_${fk}_fkey`,
          column: fk,
          referencedTable: assoc.target.getTableName(),
          referencedColumn: assoc.target.primaryKeyAttribute,
          onDelete: assoc.options?.onDelete || "CASCADE",
          onUpdate: assoc.options?.onUpdate || "CASCADE"
        });
      }
    });
    const isJoinTable = isManyToManyJoinTable(tableName, columns, foreignKeys, indexes);
    if (isJoinTable) {
      const fkColumns = foreignKeys.map((fk) => fk.column);
      const mainFKs = fkColumns.slice(0, 2);
      const hasUniqueConstraint = uniques.some((u) => {
        const sortedU = [
          ...u.columns
        ].sort();
        const sortedFK = [
          ...mainFKs
        ].sort();
        return sortedU.length === sortedFK.length && sortedU.every((col2, i) => col2 === sortedFK[i]);
      });
      if (!hasUniqueConstraint) {
        const constraintName = `${tableName}_${mainFKs.join("_")}_uq`;
        uniques.push({
          name: constraintName,
          columns: mainFKs
        });
      }
      fkColumns.forEach((fkCol) => {
        const col2 = columns.find((c) => c.name === fkCol);
        if (col2) col2.unique = false;
      });
    }
    schema.tables.push({
      name: tableName,
      columns,
      indexes,
      foreignKeys,
      uniques,
      checks,
      primaryKeys
    });
  }
  return schema;
}
__name(introspect, "introspect");

// src/services/migrate.ts
var import_execa = require("execa");

// src/services/diff.ts
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
__name(same, "same");
function columnSimilarity(a, b) {
  const normalize = /* @__PURE__ */ __name((s) => s.toLowerCase().replace(/[_-]/g, ""), "normalize");
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
__name(columnSimilarity, "columnSimilarity");
function detectRenames(beforeCols, afterCols, getName) {
  const renames = /* @__PURE__ */ new Map();
  const droppedCols = beforeCols.filter((b) => !afterCols.find((a) => getName(a) === getName(b)));
  const addedCols = afterCols.filter((a) => !beforeCols.find((b) => getName(b) === getName(a)));
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
__name(detectRenames, "detectRenames");
function sortByDependencies(actions) {
  const createTables = actions.filter((a) => a.kind === "createTable");
  const dropFKs = actions.filter((a) => a.kind === "dropFK");
  const addFKs = actions.filter((a) => a.kind === "addFK");
  const dropTables = actions.filter((a) => a.kind === "dropTable");
  const rest = actions.filter((a) => a.kind !== "createTable" && a.kind !== "dropFK" && a.kind !== "addFK" && a.kind !== "dropTable");
  return [
    ...dropFKs,
    ...createTables,
    ...rest,
    ...addFKs,
    ...dropTables
  ];
}
__name(sortByDependencies, "sortByDependencies");
function getUniqueColumns(uniques) {
  const uniqueCols = /* @__PURE__ */ new Set();
  uniques.forEach((u) => {
    if (u.columns.length === 1) {
      uniqueCols.add(u.columns[0]);
    }
  });
  return uniqueCols;
}
__name(getUniqueColumns, "getUniqueColumns");
function filterRedundantIndexes(indexes, uniques) {
  const uniqueCols = getUniqueColumns(uniques);
  return indexes.filter((idx) => {
    if (idx.unique) return false;
    if (idx.columns.length === 1 && uniqueCols.has(idx.columns[0])) {
      return false;
    }
    return true;
  });
}
__name(filterRedundantIndexes, "filterRedundantIndexes");
function diff(before, after) {
  const out = [];
  after.tables.forEach((t) => {
    if (!before.tables.find((x) => x.name === t.name)) {
      out.push({
        kind: "createTable",
        table: t
      });
    }
  });
  before.tables.forEach((t) => {
    if (!after.tables.find((x) => x.name === t.name)) {
      out.push({
        kind: "dropTable",
        tableName: t.name,
        backup: t
      });
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
        newName
      });
    });
    t.columns.forEach((c) => {
      const p = prev.columns.find((x) => x.name === c.name);
      const renamedFrom = Array.from(colRenames.entries()).find(([_, newN]) => newN === c.name);
      if (renamedFrom) {
        const oldCol = prev.columns.find((x) => x.name === renamedFrom[0]);
        if (oldCol && !same(oldCol, {
          ...c,
          name: oldCol.name
        })) {
          out.push({
            kind: "alterColumn",
            tableName: t.name,
            before: oldCol,
            after: c
          });
        }
      } else if (!p) {
        out.push({
          kind: "addColumn",
          tableName: t.name,
          column: c
        });
      } else if (!same(p, c)) {
        out.push({
          kind: "alterColumn",
          tableName: t.name,
          before: p,
          after: c
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
          backup: c
        });
      }
    });
    if (!same(prev.primaryKeys, t.primaryKeys)) {
      out.push({
        kind: "changePrimaryKey",
        tableName: t.name,
        before: prev.primaryKeys,
        after: t.primaryKeys
      });
    }
    const filteredPrevIndexes = filterRedundantIndexes(prev.indexes, prev.uniques);
    const filteredAfterIndexes = filterRedundantIndexes(t.indexes, t.uniques);
    filteredAfterIndexes.forEach((i) => {
      const p = filteredPrevIndexes.find((x) => x.name === i.name);
      if (!p) out.push({
        kind: "createIndex",
        tableName: t.name,
        index: i
      });
      else if (!same(p, i)) {
        out.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: i.name,
          backup: p
        });
        out.push({
          kind: "createIndex",
          tableName: t.name,
          index: i
        });
      }
    });
    filteredPrevIndexes.forEach((i) => {
      if (!filteredAfterIndexes.find((x) => x.name === i.name)) {
        out.push({
          kind: "dropIndex",
          tableName: t.name,
          indexName: i.name,
          backup: i
        });
      }
    });
    t.foreignKeys.forEach((fk) => {
      const p = prev.foreignKeys.find((x) => x.name === fk.name);
      if (!p) out.push({
        kind: "addFK",
        tableName: t.name,
        fk
      });
      else if (!same(p, fk)) {
        out.push({
          kind: "dropFK",
          tableName: t.name,
          fkName: p.name,
          backup: p
        });
        out.push({
          kind: "addFK",
          tableName: t.name,
          fk
        });
      }
    });
    prev.foreignKeys.forEach((fk) => {
      if (!t.foreignKeys.find((x) => x.name === fk.name)) {
        out.push({
          kind: "dropFK",
          tableName: t.name,
          fkName: fk.name,
          backup: fk
        });
      }
    });
    const beforeUnique = prev.uniques || [];
    const afterUnique = t.uniques || [];
    afterUnique.forEach((u) => {
      const old = beforeUnique.find((x) => x.name === u.name);
      if (!old) out.push({
        kind: "addUnique",
        tableName: t.name,
        unique: u
      });
      else if (!same(old.columns, u.columns)) {
        out.push({
          kind: "dropUnique",
          tableName: t.name,
          uniqueName: old.name,
          backup: old
        });
        out.push({
          kind: "addUnique",
          tableName: t.name,
          unique: u
        });
      }
    });
    beforeUnique.forEach((u) => {
      if (!afterUnique.find((x) => x.name === u.name)) {
        out.push({
          kind: "dropUnique",
          tableName: t.name,
          uniqueName: u.name,
          backup: u
        });
      }
    });
    const beforeChecks = prev.checks || [];
    const afterChecks = t.checks || [];
    afterChecks.forEach((ch) => {
      const old = beforeChecks.find((x) => x.name === ch.name);
      if (!old) out.push({
        kind: "addCheck",
        tableName: t.name,
        check: ch
      });
      else if (!same(old, ch)) {
        out.push({
          kind: "dropCheck",
          tableName: t.name,
          checkName: old.name,
          backup: old
        });
        out.push({
          kind: "addCheck",
          tableName: t.name,
          check: ch
        });
      }
    });
    beforeChecks.forEach((ch) => {
      if (!afterChecks.find((x) => x.name === ch.name)) {
        out.push({
          kind: "dropCheck",
          tableName: t.name,
          checkName: ch.name,
          backup: ch
        });
      }
    });
  });
  return sortByDependencies(out);
}
__name(diff, "diff");

// src/services/generator.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
function mapType(dbType, enumValues) {
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
      else if (baseType.includes("DATE") || baseType.includes("TIMESTAMP")) innerType = "Sequelize.DATE";
      else if (baseType.includes("UUID")) innerType = "Sequelize.UUID";
      else if (baseType.includes("JSON")) innerType = "Sequelize.JSON";
      else if (baseType.includes("JSONB")) innerType = "Sequelize.JSONB";
      else if (baseType.includes("DECIMAL")) innerType = "Sequelize.DECIMAL";
      else if (baseType.includes("FLOAT") || baseType.includes("REAL")) innerType = "Sequelize.FLOAT";
      else innerType = "Sequelize.STRING";
    } else if (arrayMatch) {
      const baseType = arrayMatch[1].toUpperCase();
      if (baseType.includes("INT")) innerType = "Sequelize.INTEGER";
      else if (baseType.includes("BIGINT")) innerType = "Sequelize.BIGINT";
      else if (baseType.includes("TEXT")) innerType = "Sequelize.TEXT";
      else if (baseType.includes("BOOLEAN")) innerType = "Sequelize.BOOLEAN";
      else if (baseType.includes("DATE") || baseType.includes("TIMESTAMP")) innerType = "Sequelize.DATE";
      else if (baseType.includes("UUID")) innerType = "Sequelize.UUID";
      else if (baseType.includes("JSON")) innerType = "Sequelize.JSON";
      else if (baseType.includes("JSONB")) innerType = "Sequelize.JSONB";
      else if (baseType.includes("DECIMAL")) innerType = "Sequelize.DECIMAL";
      else if (baseType.includes("FLOAT") || baseType.includes("REAL")) innerType = "Sequelize.FLOAT";
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
      const values = inner.split(",").map((v) => v.trim().replace(/^["']+|["']+$/g, ""));
      return `Sequelize.ENUM(${values.map((v) => `"${v}"`).join(", ")})`;
    }
  }
  if (upper.includes("TIMESTAMP") || upper.includes("DATE")) return "Sequelize.DATE";
  if (upper.includes("UUID")) return "Sequelize.UUID";
  if (upper.includes("BIGINT")) return "Sequelize.BIGINT";
  if (upper.includes("INT")) return "Sequelize.INTEGER";
  if (upper.includes("TEXT")) return "Sequelize.TEXT";
  if (upper.includes("CHAR") || upper.includes("STRING")) return "Sequelize.STRING";
  if (upper.includes("BOOLEAN")) return "Sequelize.BOOLEAN";
  if (upper.includes("JSONB")) return "Sequelize.JSONB";
  if (upper.includes("JSON")) return "Sequelize.JSON";
  if (upper.includes("DECIMAL")) return "Sequelize.DECIMAL";
  if (upper.includes("FLOAT") || upper.includes("REAL")) return "Sequelize.FLOAT";
  return "Sequelize.STRING";
}
__name(mapType, "mapType");
function col(c) {
  const parts = [];
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
    } else if (c.defaultValue !== null && c.defaultValue !== void 0) {
      const defaultStr = String(c.defaultValue);
      if (typeof c.defaultValue === "function" || defaultStr === "[Function]" || defaultStr.includes("function")) {
        if (c.name === "id" && (c.type === "UUID" || c.dbType?.includes("UUID"))) {
          defaultValue = 'Sequelize.fn("gen_random_uuid")';
        } else {
          defaultValue = "Sequelize.UUIDV4";
        }
      } else if (Array.isArray(c.defaultValue)) {
        defaultValue = JSON.stringify(c.defaultValue);
      } else {
        defaultValue = JSON.stringify(c.defaultValue);
      }
    } else if (c.name === "id" && c.primaryKey && (c.type === "UUID" || c.dbType?.includes("UUID"))) {
      defaultValue = 'Sequelize.fn("gen_random_uuid")';
    }
    parts.push(`defaultValue: ${defaultValue}`);
  }
  return `{
    ${parts.join(",\n    ")}
  }`;
}
__name(col, "col");
function generate(actions) {
  if (!actions.length) return null;
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const name = `${ts}-auto-migration.cjs`;
  const dir = import_path3.default.join(process.cwd(), "src/migrations");
  if (!import_fs3.default.existsSync(dir)) import_fs3.default.mkdirSync(dir, {
    recursive: true
  });
  const createTables = [];
  const addConstraints = [];
  const addIndexes = [];
  const otherUp = [];
  const dropConstraints = [];
  const dropTables = [];
  const otherDown = [];
  actions.forEach((a) => {
    if (a.kind === "createTable") {
      const columns = a.table.columns.map((c) => `"${c.name}": ${col(c)}`).join(",\n      ");
      createTables.push(`await queryInterface.createTable("${a.table.name}", {
      ${columns}
    });`);
      a.table.foreignKeys.forEach((fk) => {
        addConstraints.push(`await queryInterface.addConstraint("${a.table.name}", {
      type: "foreign key",
      fields: ["${fk.column}"],
      name: "${fk.name}",
      references: { table: "${fk.referencedTable}", field: "${fk.referencedColumn}" },
      onDelete: ${fk.onDelete ? `"${fk.onDelete}"` : "null"},
      onUpdate: ${fk.onUpdate ? `"${fk.onUpdate}"` : "null"}
    });`);
        dropConstraints.push(`await queryInterface.removeConstraint("${a.table.name}", "${fk.name}");`);
      });
      a.table.uniques.forEach((u) => {
        addConstraints.push(`await queryInterface.addConstraint("${a.table.name}", {
      type: "unique",
      name: "${u.name}",
      fields: ${JSON.stringify(u.columns)}
    });`);
        dropConstraints.push(`await queryInterface.removeConstraint("${a.table.name}", "${u.name}");`);
      });
      a.table.indexes.forEach((idx) => {
        if (!idx.unique) {
          const options = {
            name: idx.name,
            unique: idx.unique
          };
          if (idx.where) options.where = idx.where;
          addIndexes.push(`await queryInterface.addIndex("${a.table.name}", ${JSON.stringify(idx.columns)}, ${JSON.stringify(options)});`);
        }
      });
      dropTables.push(`await queryInterface.dropTable("${a.table.name}");`);
    }
    if (a.kind === "dropTable") {
      otherUp.push(`await queryInterface.dropTable("${a.tableName}");`);
    }
    if (a.kind === "addColumn") {
      otherUp.push(`await queryInterface.addColumn("${a.tableName}", "${a.column.name}", ${col(a.column)});`);
      otherDown.unshift(`await queryInterface.removeColumn("${a.tableName}", "${a.column.name}");`);
    }
    if (a.kind === "dropColumn") {
      otherUp.push(`await queryInterface.removeColumn("${a.tableName}", "${a.columnName}");`);
    }
    if (a.kind === "alterColumn") {
      otherUp.push(`await queryInterface.changeColumn("${a.tableName}", "${a.after.name}", ${col(a.after)});`);
      otherDown.unshift(`await queryInterface.changeColumn("${a.tableName}", "${a.before.name}", ${col(a.before)});`);
    }
    if (a.kind === "createIndex") {
      const options = {
        name: a.index.name,
        unique: a.index.unique
      };
      if (a.index.where) options.where = a.index.where;
      otherUp.push(`await queryInterface.addIndex("${a.tableName}", ${JSON.stringify(a.index.columns)}, ${JSON.stringify(options)});`);
      otherDown.unshift(`await queryInterface.removeIndex("${a.tableName}", "${a.index.name}");`);
    }
    if (a.kind === "dropIndex") {
      otherUp.push(`await queryInterface.removeIndex("${a.tableName}", "${a.indexName}");`);
    }
    if (a.kind === "addFK") {
      otherUp.push(`await queryInterface.addConstraint("${a.tableName}", {
  type: "foreign key",
  fields: ["${a.fk.column}"],
  name: "${a.fk.name}",
  references: { table: "${a.fk.referencedTable}", field: "${a.fk.referencedColumn}" },
  onDelete: ${a.fk.onDelete ? `"${a.fk.onDelete}"` : "null"},
  onUpdate: ${a.fk.onUpdate ? `"${a.fk.onUpdate}"` : "null"}
});`);
      otherDown.unshift(`await queryInterface.removeConstraint("${a.tableName}", "${a.fk.name}");`);
    }
    if (a.kind === "dropFK") {
      otherUp.push(`await queryInterface.removeConstraint("${a.tableName}", "${a.fkName}");`);
    }
    if (a.kind === "addUnique") {
      otherUp.push(`await queryInterface.addConstraint("${a.tableName}", {
  type: "unique",
  name: "${a.unique.name}",
  fields: ${JSON.stringify(a.unique.columns)}
});`);
      otherDown.unshift(`await queryInterface.removeConstraint("${a.tableName}", "${a.unique.name}");`);
    }
    if (a.kind === "dropUnique") {
      otherUp.push(`await queryInterface.removeConstraint("${a.tableName}", "${a.uniqueName}");`);
    }
  });
  const up = [
    ...createTables,
    ...addConstraints,
    ...addIndexes,
    ...otherUp
  ].filter(Boolean);
  const down = [
    ...dropConstraints,
    ...dropTables,
    ...otherDown
  ].filter(Boolean);
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
  const file = import_path3.default.join(dir, name);
  import_fs3.default.writeFileSync(file, content);
  return file;
}
__name(generate, "generate");

// src/services/state.ts
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
function getSnapshotPaths() {
  const cfg = loadSeqmigConfig();
  const snapshotDir = cfg.snapshotDir || ".seqmig/snapshots";
  const migrationDir = cfg.migrationDir || "migrations";
  const SNAPSHOT_FILE = import_path4.default.join(process.cwd(), snapshotDir, "schema-snapshot.json");
  const SNAPSHOT_BACKUP_DIR = import_path4.default.join(process.cwd(), snapshotDir, "backups");
  return {
    SNAPSHOT_FILE,
    SNAPSHOT_BACKUP_DIR,
    migrationDir,
    snapshotDir
  };
}
__name(getSnapshotPaths, "getSnapshotPaths");
function loadSnapshot() {
  const { SNAPSHOT_FILE } = getSnapshotPaths();
  if (!import_fs4.default.existsSync(SNAPSHOT_FILE)) {
    return {
      tables: []
    };
  }
  const raw = import_fs4.default.readFileSync(SNAPSHOT_FILE, "utf8");
  return JSON.parse(raw);
}
__name(loadSnapshot, "loadSnapshot");
function saveSnapshot(schema) {
  const { SNAPSHOT_FILE, SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();
  const dir = import_path4.default.dirname(SNAPSHOT_FILE);
  if (!import_fs4.default.existsSync(dir)) import_fs4.default.mkdirSync(dir, {
    recursive: true
  });
  if (!import_fs4.default.existsSync(SNAPSHOT_BACKUP_DIR)) import_fs4.default.mkdirSync(SNAPSHOT_BACKUP_DIR, {
    recursive: true
  });
  if (import_fs4.default.existsSync(SNAPSHOT_FILE)) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFile = import_path4.default.join(SNAPSHOT_BACKUP_DIR, `snapshot-${timestamp}.json`);
    import_fs4.default.copyFileSync(SNAPSHOT_FILE, backupFile);
    cleanOldBackups(SNAPSHOT_BACKUP_DIR, 20);
  }
  import_fs4.default.writeFileSync(SNAPSHOT_FILE, JSON.stringify(schema, null, 2));
}
__name(saveSnapshot, "saveSnapshot");
function cleanOldBackups(backupDir, keepCount) {
  const backups = import_fs4.default.readdirSync(backupDir).filter((f) => f.startsWith("snapshot-")).sort().reverse();
  backups.slice(keepCount).forEach((file) => {
    import_fs4.default.unlinkSync(import_path4.default.join(backupDir, file));
  });
}
__name(cleanOldBackups, "cleanOldBackups");
function listBackups() {
  const { SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();
  if (!import_fs4.default.existsSync(SNAPSHOT_BACKUP_DIR)) return [];
  return import_fs4.default.readdirSync(SNAPSHOT_BACKUP_DIR).filter((f) => f.startsWith("snapshot-")).sort().reverse();
}
__name(listBackups, "listBackups");
function restoreBackup(backupFile) {
  const { SNAPSHOT_FILE, SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();
  const backupPath = import_path4.default.join(SNAPSHOT_BACKUP_DIR, backupFile);
  if (!import_fs4.default.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  import_fs4.default.copyFileSync(backupPath, SNAPSHOT_FILE);
  console.log(`Restored snapshot from ${backupFile}`);
}
__name(restoreBackup, "restoreBackup");

// src/services/migrate.ts
async function preview() {
  const before = loadSnapshot();
  const after = await introspect();
  const actions = diff(before, after);
  console.log(JSON.stringify(actions, null, 2));
}
__name(preview, "preview");
async function generateMigration() {
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
__name(generateMigration, "generateMigration");
async function runMigrations() {
  console.log("Running migrations via sequelize-cli...\n");
  await (0, import_execa.execa)("npx", [
    "sequelize-cli",
    "db:migrate"
  ], {
    stdio: "inherit"
  });
}
__name(runMigrations, "runMigrations");
async function rollbackLast() {
  console.log("Rolling back last migration via sequelize-cli...\n");
  await (0, import_execa.execa)("npx", [
    "sequelize-cli",
    "db:migrate:undo"
  ], {
    stdio: "inherit"
  });
}
__name(rollbackLast, "rollbackLast");
async function rebuildSnapshot() {
  console.log("Rebuilding snapshot in 3 seconds...");
  await new Promise((r) => setTimeout(r, 3e3));
  const db = await introspect();
  saveSnapshot(db);
  console.log("Snapshot rebuilt.");
}
__name(rebuildSnapshot, "rebuildSnapshot");
async function validateSnapshot() {
  const snapshot = loadSnapshot();
  const actual = await introspect();
  const actions = diff(snapshot, actual);
  if (actions.length === 0) {
    console.log("Snapshot is in sync with database.");
    return;
  }
  console.log("Snapshot is OUT OF SYNC:");
  console.log(JSON.stringify(actions, null, 2));
}
__name(validateSnapshot, "validateSnapshot");

// src/index.ts
function wrap(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  };
}
__name(wrap, "wrap");
async function runCli() {
  const program = new import_commander.Command();
  program.name("seqmig").description("Sequelize auto-migration CLI").version(version);
  program.command("init").description("Initialize .seqmigrc configuration file").action(() => {
    initConfig();
  });
  program.command("preview").description("Preview schema diff").action(wrap(preview));
  program.command("generate").description("Generate migration file").action(wrap(generateMigration));
  program.command("run").description("Run pending migrations").action(wrap(runMigrations));
  program.command("rollback").description("Rollback last migration").action(wrap(rollbackLast));
  program.command("rebuild").description("Rebuild snapshot").action(wrap(rebuildSnapshot));
  program.command("validate").description("Validate snapshot").action(wrap(validateSnapshot));
  program.command("backups").description("List snapshot backups").action(() => {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log("No backups found.");
      return;
    }
    console.log("Available backups:");
    backups.forEach((b, i) => console.log(`${i + 1}. ${b}`));
  });
  program.command("restore <backup>").description("Restore snapshot").action((backup) => {
    restoreBackup(backup);
  });
  program.command("introspect").description("Introspect DB schema").action(wrap(async () => {
    const result = await introspect();
    console.log(JSON.stringify(result, null, 2));
  }));
  await program.parseAsync(process.argv);
}
__name(runCli, "runCli");
if (require.main === module) {
  runCli();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runCli
});
//# sourceMappingURL=index.js.map