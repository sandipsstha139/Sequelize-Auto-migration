import { Sequelize } from "sequelize";
import { loadUserSequelizeConfig } from "./load-config";
import { loadSeqmigConfig } from "./load-seqmig";

export async function loadUserSequelize(customPath?: string) {
  const seqmig = loadSeqmigConfig();
  const configPath = customPath || seqmig.config;

  const dbConfig = await loadUserSequelizeConfig(configPath);
  return new Sequelize(dbConfig);
}
