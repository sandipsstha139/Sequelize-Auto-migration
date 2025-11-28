"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("posts", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        unique: false,
        defaultValue: null,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
    });
    await queryInterface.createTable("profiles", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        unique: false,
        defaultValue: null,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      avatarUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      birthday: {
        type: Sequelize.DATE,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
    });
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        unique: false,
        defaultValue: null,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        unique: true,
        defaultValue: null,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: "active",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        primaryKey: false,
        unique: false,
        defaultValue: null,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("posts");
    await queryInterface.dropTable("profiles");
    await queryInterface.dropTable("users");
  },
};
