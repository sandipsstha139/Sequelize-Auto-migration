import fs from "fs";
import path from "path";
import { ColumnSchema, MigrationAction } from "./schema-types";

function columnToSequelizeDef(col: ColumnSchema): string {
  const base: any = {
    type: `Sequelize.${col.dbType}`, // you can refine or map manually if needed
    allowNull: col.allowNull,
  };

  if (col.defaultValue !== null && col.defaultValue !== undefined) {
    base.defaultValue = col.defaultValue;
  }
  if (col.primaryKey) base.primaryKey = true;
  if (col.unique) base.unique = true;

  // JSON.stringify but keep type as expression
  const json = JSON.stringify(base, null, 2).replace(
    /"Sequelize\.(.+)"/g,
    "Sequelize.$1"
  );

  return json;
}

function generateUp(actions: MigrationAction[]): string[] {
  const lines: string[] = [];

  for (const a of actions) {
    switch (a.kind) {
      case "createEnum":
        // For Postgres, you might create type manually, but Sequelize does not have direct API.
        lines.push(
          `    // NOTE: createEnum '${a.name}' manually if needed, or rely on column type`
        );
        break;

      case "alterEnum":
        lines.push(
          `    // NOTE: alterEnum '${
            a.name
          }' manually. Before: ${JSON.stringify(
            a.before
          )}, After: ${JSON.stringify(a.after)}`
        );
        break;

      case "dropEnum":
        lines.push(`    // NOTE: dropEnum '${a.name}' manually if needed`);
        break;

      case "createTable": {
        const cols: string[] = [];
        a.table.columns.forEach((col) => {
          cols.push(
            `      ${JSON.stringify(col.name)}: ${columnToSequelizeDef(col)}`
          );
        });
        lines.push(
          `    await queryInterface.createTable(${JSON.stringify(
            a.table.name
          )}, {\n${cols.join(",\n")}\n    });`
        );
        break;
      }

      case "dropTable":
        lines.push(
          `    await queryInterface.dropTable(${JSON.stringify(a.tableName)});`
        );
        break;

      case "addColumn":
        lines.push(
          `    await queryInterface.addColumn(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.column.name)}, ${columnToSequelizeDef(
            a.column
          )});`
        );
        break;

      case "dropColumn":
        lines.push(
          `    await queryInterface.removeColumn(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.columnName)});`
        );
        break;

      case "alterColumn":
        lines.push(
          `    await queryInterface.changeColumn(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.after.name)}, ${columnToSequelizeDef(
            a.after
          )});`
        );
        break;

      case "createIndex":
        lines.push(
          `    await queryInterface.addIndex(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.index.columns)}, { name: ${JSON.stringify(
            a.index.name
          )}, unique: ${a.index.unique} });`
        );
        break;

      case "dropIndex":
        lines.push(
          `    await queryInterface.removeIndex(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.indexName)});`
        );
        break;

      case "addForeignKey":
        lines.push(
          `    await queryInterface.addConstraint(${JSON.stringify(
            a.tableName
          )}, {\n` +
            `      type: 'foreign key',\n` +
            `      name: ${JSON.stringify(a.fk.name)},\n` +
            `      fields: [${JSON.stringify(a.fk.column)}],\n` +
            `      references: {\n` +
            `        table: ${JSON.stringify(a.fk.referencedTable)},\n` +
            `        field: ${JSON.stringify(a.fk.referencedColumn)},\n` +
            `      },\n` +
            (a.fk.onDelete
              ? `      onDelete: ${JSON.stringify(a.fk.onDelete)},\n`
              : "") +
            (a.fk.onUpdate
              ? `      onUpdate: ${JSON.stringify(a.fk.onUpdate)},\n`
              : "") +
            `    });`
        );
        break;

      case "dropForeignKey":
        lines.push(
          `    await queryInterface.removeConstraint(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.fkName)});`
        );
        break;
    }
  }

  return lines;
}

function generateDown(actions: MigrationAction[]): string[] {
  // reverse the actions
  const reversed = [...actions].reverse();
  const lines: string[] = [];

  for (const a of reversed) {
    switch (a.kind) {
      case "createTable":
        lines.push(
          `    await queryInterface.dropTable(${JSON.stringify(a.table.name)});`
        );
        break;
      case "dropTable":
        lines.push(
          `    // down for dropTable: re-create table '${a.tableName}' manually if needed`
        );
        break;
      case "addColumn":
        lines.push(
          `    await queryInterface.removeColumn(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.column.name)});`
        );
        break;
      case "dropColumn":
        lines.push(
          `    // down for dropColumn '${a.columnName}' on '${a.tableName}' not auto generated`
        );
        break;
      case "alterColumn":
        lines.push(
          `    await queryInterface.changeColumn(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.before.name)}, ${columnToSequelizeDef(
            a.before
          )});`
        );
        break;
      case "createIndex":
        lines.push(
          `    await queryInterface.removeIndex(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.index.name)});`
        );
        break;
      case "dropIndex":
        lines.push(
          `    // down for dropIndex '${a.indexName}' not auto generated`
        );
        break;
      case "addForeignKey":
        lines.push(
          `    await queryInterface.removeConstraint(${JSON.stringify(
            a.tableName
          )}, ${JSON.stringify(a.fk.name)});`
        );
        break;
      case "dropForeignKey":
        lines.push(
          `    // down for dropForeignKey '${a.fkName}' not auto generated`
        );
        break;
      case "createEnum":
      case "alterEnum":
      case "dropEnum":
        lines.push(
          `    // down for enum '${(a as any).name}' not auto generated`
        );
        break;
    }
  }

  return lines;
}

export function generateMigrationFile(
  actions: MigrationAction[]
): string | null {
  if (!actions.length) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-auto-migration.ts`;
  const migrationsDir = path.join(process.cwd(), "src/migrations");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const upLines = generateUp(actions);
  const downLines = generateDown(actions);

  const content = `
import { QueryInterface, Sequelize } from "sequelize";

export default {
  async up(queryInterface: QueryInterface, Sequelize: typeof import("sequelize")) {
${upLines.join("\n")}
  },

  async down(queryInterface: QueryInterface, Sequelize: typeof import("sequelize")) {
${downLines.join("\n")}
  },
};
`.trimStart();

  const filePath = path.join(migrationsDir, fileName);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}
