import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import User from "./user.model";

@Table({
  tableName: "profiles",
  timestamps: true,
})
export default class Profile extends Model<Profile> {
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  fullName?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  age?: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  address?: string;

  // 🔥 Foreign key column
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId!: number;

  // 🔥 Relation definition
  @BelongsTo(() => User)
  user!: User;
}
