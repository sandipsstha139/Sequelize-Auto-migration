const dotenv = require("dotenv");

const NODE_ENV = process.env.NODE_ENV;

switch (NODE_ENV) {
  case "local":
    dotenv.config({ path: ".env.local" });
    break;
  case "uat":
    dotenv.config({ path: ".env.uat" });
    break;
  case "production":
    dotenv.config({ path: ".env.production" });
    break;
  default:
    dotenv.config({ path: ".env" });
}

module.exports = {
  development: {
    dialect: "postgres",
    host: "89.116.122.52",
    port: 5432,
    database: "xsite_v3",
    username: "beeaver",
    password: "Ultimate@21",
  },
};

// module.exports = {
//   development: {
//     username: "beeaver",
//     password: "Ultimate@21",
//     database: "xsite_v3",
//     host: "89.116.122.52",
//     port: 5432,
//     dialect: "postgres",
//   },
//   uat: {
//     username: "beeaver",
//     password: "Ultimate@21",
//     database: "xsite_v2",
//     host: "209.182.232.169",
//     port: 5432,
//     dialect: "postgres",
//   },
//   production: {
//     username: "xsite",
//     password: "Ultimate@21",
//     database: "xsite_production",
//     host: "31.97.60.102",
//     port: 5432,
//     dialect: "postgres",
//   },
// };
