import fs from "fs";
import path from "path";

export interface SeqmigConfig {
  configFile?: string;
  snapshotDir?: string;
  migrationDir?: string;
  modelsPath?: string;
}

export function loadSeqmigConfig(): SeqmigConfig {
  const rcPath = path.join(process.cwd(), ".seqmigrc");

  if (!fs.existsSync(rcPath)) {
    return {
      configFile: "./config/config.js",
      snapshotDir: ".seqmig/snapshots",
      migrationDir: "src/migrations",
      modelsPath: "src/models",
    };
  }

  const content = fs.readFileSync(rcPath, "utf8");
  const config = JSON.parse(content);

  return {
    configFile: config.configFile || "./config/config.js",
    snapshotDir: config.snapshotDir || ".seqmig/snapshots",
    migrationDir: config.migrationDir || "src/migrations",
    modelsPath: config.modelsPath || "src/models",
  };
}

export function loadSequelizeConfig(): any {
  const seqmigConfig = loadSeqmigConfig();

  const configPath = path.isAbsolute(seqmigConfig.configFile!)
    ? seqmigConfig.configFile!
    : path.join(process.cwd(), seqmigConfig.configFile!);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Sequelize config file not found: ${configPath}`);
  }

  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  const env = process.env.NODE_ENV || "development";

  const dbConfig = config[env] || config;

  if (!dbConfig.username) {
    throw new Error(
      `Missing 'username' in Sequelize config for environment: ${env}`
    );
  }
  if (!dbConfig.password) {
    throw new Error(
      `Missing 'password' in Sequelize config for environment: ${env}`
    );
  }
  if (!dbConfig.database) {
    throw new Error(
      `Missing 'database' in Sequelize config for environment: ${env}`
    );
  }
  if (!dbConfig.host) {
    throw new Error(
      `Missing 'host' in Sequelize config for environment: ${env}`
    );
  }

  return {
    username: String(dbConfig.username),
    password: String(dbConfig.password),
    database: String(dbConfig.database),
    host: String(dbConfig.host),
    port: Number(dbConfig.port || 5432),
    dialect: "postgres",
    logging: false,
  };
}

export function initConfig() {
  const rcPath = path.join(process.cwd(), ".seqmigrc");

  if (fs.existsSync(rcPath)) {
    console.log(".seqmigrc already exists");
    return;
  }

  const template = {
    configFile: "./config/config.js",
    snapshotDir: ".seqmig/snapshots",
    migrationDir: "src/migrations",
    modelsPath: "src/models",
  };

  fs.writeFileSync(rcPath, JSON.stringify(template, null, 2));
  console.log("Created .seqmigrc");
}
