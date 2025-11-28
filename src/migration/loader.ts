import { Model, ModelCtor } from "sequelize-typescript";
import { sequelize } from "../config/sequelize";

export async function loadModelDefinitions() {
  const definitions = {};

  sequelize.modelManager.models.forEach((m) => {
    const model = m as ModelCtor<Model>;

    const attrs = {};

    Object.entries(model.getAttributes()).forEach(([key, attr]: any) => {
      attrs[key] = {
        type: attr.type?.toString(),
        allowNull: attr.allowNull ?? true,
        defaultValue: attr.defaultValue ?? null,
        primaryKey: attr.primaryKey ?? false,
      };
    });

    definitions[model.tableName] = attrs;
  });

  return definitions;
}
