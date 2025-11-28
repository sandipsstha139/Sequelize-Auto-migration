import path from "path";
import { Sequelize } from "sequelize-typescript";

const cfg = require("./sequelize-cli.cjs").development;

export const sequelize = new Sequelize({
  dialect: cfg.dialect,
  host: cfg.host,
  port: cfg.port,
  username: cfg.username,
  password: cfg.password,
  database: cfg.database,
  logging: false,
  models: [path.join(__dirname, "../database/models/**/*.{ts,js}")],
});
