import { Command } from "commander";
import {
  generateMigration,
  preview,
  rollbackLast,
  runMigrations,
} from "./migrate";

export async function runCli() {
  const program = new Command();

  program
    .name("migration")
    .description("Sequelize auto-migration CLI")
    .version("1.0.0");

  program
    .command("preview")
    .description("Preview schema diff without generating a migration file")
    .action(async () => {
      await preview();
    });

  program
    .command("generate")
    .description("Generate a migration file from schema diff")
    .action(async () => {
      await generateMigration();
    });

  program
    .command("run")
    .description("Run all pending migrations")
    .action(async () => {
      await runMigrations();
    });

  program
    .command("rollback")
    .description("Rollback last migration")
    .action(async () => {
      await rollbackLast();
    });

  await program.parseAsync(process.argv);
}
