import fs from 'fs';
import path from 'path';

export function generateMigration(actions) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-auto-migration.ts`;
  const filePath = path.join(process.cwd(), "src/migrations", fileName);

  const lines = [];

  lines.push(`export default {`);
  lines.push(`  async up(queryInterface, Sequelize) {`);

  for (const a of actions) {
    if (a.type === "createTable") {
      lines.push(
        `    await queryInterface.createTable("${a.table}", ${JSON.stringify(a.columns, null, 6)});`
      );
    }
    if (a.type === "dropTable") {
      lines.push(`    await queryInterface.dropTable("${a.table}");`);
    }
    if (a.type === "addColumn") {
      lines.push(
        `    await queryInterface.addColumn("${a.table}", "${a.column}", ${JSON.stringify(a.def, null, 6)});`
      );
    }
    if (a.type === "removeColumn") {
      lines.push(
        `    await queryInterface.removeColumn("${a.table}", "${a.column}");`
      );
    }
    if (a.type === "changeColumn") {
      lines.push(
        `    await queryInterface.changeColumn("${a.table}", "${a.column}", ${JSON.stringify(a.def, null, 6)});`
      );
    }
  }

  lines.push(`  },`);
  lines.push(`  async down() {}`);
  lines.push(`};`);

  fs.writeFileSync(filePath, lines.join("\n"));
  return filePath;
}
