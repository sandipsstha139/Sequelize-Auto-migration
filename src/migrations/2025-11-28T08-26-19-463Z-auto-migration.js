
"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "username", {
    type: Sequelize.STRING,
    allowNull: true,
    primaryKey: false,
    unique: false,
    defaultValue: null
  });
    await queryInterface.removeColumn("users", "fullName");
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "username");
  },
};
