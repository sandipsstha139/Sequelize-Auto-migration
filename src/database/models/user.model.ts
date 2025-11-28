import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";

@Table({
  tableName: "users",
  timestamps: true,
})
export default class User extends Model<User> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @Unique
  @Column(DataType.STRING)
  email!: string;

  @Column(DataType.STRING)
  username!: string;

  @Column({
    type: DataType.ENUM("active", "disabled"),
    allowNull: false,
    defaultValue: "active",
  })
  status!: "active" | "disabled";
}
