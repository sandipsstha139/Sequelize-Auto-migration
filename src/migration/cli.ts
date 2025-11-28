import { Command } from "commander";
import { execa } from "execa";
import { diff } from "./diff";
import { generate } from "./generator";
import { introspect } from "./introspect";
import { loadSnapshot, saveSnapshot } from "./state";

const program = new Command();

program.command("preview").action(async () => {
  const before = loadSnapshot();
  const after = await introspect();
  const actions = diff(before, after);
  console.log(actions);
});

program.command("generate").action(async () => {
  const before = loadSnapshot();
  const after = await introspect();
  const actions = diff(before, after);
  const file = generate(actions);
  if (file) {
    saveSnapshot(after);
    console.log("Generated:", file);
  } else console.log("No changes");
});

program.command("run").action(async () => {
  await execa("npx", ["sequelize-cli", "db:migrate"], { stdio: "inherit" });
});

program.command("rollback").action(async () => {
  await execa("npx", ["sequelize-cli", "db:migrate:undo"], {
    stdio: "inherit",
  });
});

program.parse(process.argv);
