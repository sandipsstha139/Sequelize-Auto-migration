import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import User from "./user.model";

@Table({
  tableName: "posts",
  timestamps: true,
})
export default class Post extends Model<Post> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @Column(DataType.STRING)
  title!: string;

  @Column(DataType.TEXT)
  content!: string;

  @Column(DataType.ENUM("draft", "published"))
  status!: "draft" | "published";

  @ForeignKey(() => User)
  @Column
  userId!: number;

  @BelongsTo(() => User)
  user!: User;
}
