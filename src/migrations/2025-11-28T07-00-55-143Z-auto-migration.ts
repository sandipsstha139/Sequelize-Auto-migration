export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "address");
  },
  async down() {}
};