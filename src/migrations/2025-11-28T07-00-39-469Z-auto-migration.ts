export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "address", {
      "type": "VARCHAR(255)",
      "allowNull": false,
      "defaultValue": null,
      "primaryKey": false
});
  },
  async down() {}
};