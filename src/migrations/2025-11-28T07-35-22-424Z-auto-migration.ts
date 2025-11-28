import { QueryInterface } from "sequelize";

export default {
  async up(
    queryInterface: QueryInterface,
    Sequelize: typeof import("sequelize")
  ) {
    await queryInterface.createTable("profiles", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      age: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addColumn("users", "metadata", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.removeColumn("users", "profileData");
    await queryInterface.addConstraint("users", {
      type: "foreign key",
      name: "users_userId_fkey",
      fields: ["userId"],
      references: {
        table: "profiles",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  async down(
    queryInterface: QueryInterface,
    Sequelize: typeof import("sequelize")
  ) {
    await queryInterface.removeConstraint("users", "users_userId_fkey");
    // down for dropColumn 'profileData' on 'users' not auto generated
    await queryInterface.removeColumn("users", "metadata");
    await queryInterface.dropTable("profiles");
  },
};
