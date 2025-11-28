export type ScalarType =
  | "STRING"
  | "TEXT"
  | "INTEGER"
  | "BIGINT"
  | "BOOLEAN"
  | "DATE"
  | "FLOAT"
  | "DECIMAL"
  | "JSON"
  | "UUID"
  | "ENUM";

export type ColumnSchema = {
  name: string;
  type: ScalarType;
  dbType: string;
  allowNull: boolean;
  defaultValue: any;
  primaryKey: boolean;
  unique: boolean;
};

export type IndexSchema = {
  name: string;
  columns: string[];
  unique: boolean;
};

export type ForeignKeySchema = {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onUpdate: string | null;
  onDelete: string | null;
};

export type UniqueConstraintSchema = {
  name: string;
  columns: string[];
};

export type EnumSchema = {
  name: string;
  values: string[];
};

export type TableSchema = {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
  uniques: UniqueConstraintSchema[];
};

export type DatabaseSchema = {
  tables: TableSchema[];
  enums: Record<string, string[]>;
};

export type MigrationAction =
  | { kind: "createTable"; table: TableSchema }
  | { kind: "dropTable"; tableName: string }
  | { kind: "addColumn"; tableName: string; column: ColumnSchema }
  | { kind: "dropColumn"; tableName: string; columnName: string }
  | {
      kind: "alterColumn";
      tableName: string;
      before: ColumnSchema;
      after: ColumnSchema;
    }
  | { kind: "createIndex"; tableName: string; index: IndexSchema }
  | { kind: "dropIndex"; tableName: string; indexName: string }
  | { kind: "addFK"; tableName: string; fk: ForeignKeySchema }
  | { kind: "dropFK"; tableName: string; fkName: string }
  | { kind: "addUnique"; tableName: string; unique: UniqueConstraintSchema }
  | { kind: "dropUnique"; tableName: string; uniqueName: string }
  | { kind: "createEnum"; enum: EnumSchema }
  | { kind: "alterEnum"; before: EnumSchema; after: EnumSchema }
  | { kind: "dropEnum"; enumName: string };
