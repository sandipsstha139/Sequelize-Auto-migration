import { Column, DataType, HasOne, Model, Table } from "sequelize-typescript";
import Profile from "./profile.model";

@Table({
  tableName: "users",
  timestamps: true,
})
export default class User extends Model<User> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  username!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password?: string;

  @HasOne(() => Profile)
  profile!: Profile;

  @Column({
    type: DataType.JSONB,
  })
  metadata?: object;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  updatedAt!: Date;
}
