// module.exports = {
//   development: {
//     username: "postgres",
//     password: "sandip",
//     database: "sequelize_mig_test",
//     host: "127.0.0.1",
//     port: 5432,
//     dialect: "postgres",
//     logging: console.log,
//   },
// };

import path from "path";
import { Sequelize } from "sequelize-typescript";

export const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "sandip",
  database: process.env.DB_NAME || "sequelize_mig_test",
  logging: false,

  models: [path.join(__dirname, "../database/models/**/*.{ts,js}")],
});
