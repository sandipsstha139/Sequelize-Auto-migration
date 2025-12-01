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
  | "JSONB"
  | "UUID"
  | "ENUM"
  | "ARRAY";

export type ColumnSchema = {
  name: string;
  type: ScalarType;
  dbType: string;
  allowNull: boolean;
  defaultValue?: any;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  comment?: string | null;
  enumValues?: string[];
};

export type IndexSchema = {
  name: string;
  columns: string[];
  unique: boolean;
  where?: any | null;
  type?: string | null;
  using?: string | null;
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

export type CheckConstraintSchema = {
  name: string;
  expression: string;
};

export type TableSchema = {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
  uniques: UniqueConstraintSchema[];
  checks: CheckConstraintSchema[];
  primaryKeys: string[];
};

export type DatabaseSchema = {
  tables: TableSchema[];
};

export type MigrationAction =
  | { kind: "createTable"; table: TableSchema }
  | { kind: "dropTable"; tableName: string; backup: TableSchema }
  | { kind: "addColumn"; tableName: string; column: ColumnSchema }
  | {
      kind: "dropColumn";
      tableName: string;
      columnName: string;
      backup: ColumnSchema;
    }
  | {
      kind: "renameColumn";
      tableName: string;
      oldName: string;
      newName: string;
    }
  | {
      kind: "alterColumn";
      tableName: string;
      before: ColumnSchema;
      after: ColumnSchema;
    }
  | { kind: "createIndex"; tableName: string; index: IndexSchema }
  | {
      kind: "dropIndex";
      tableName: string;
      indexName: string;
      backup: IndexSchema;
    }
  | { kind: "addFK"; tableName: string; fk: ForeignKeySchema }
  | {
      kind: "dropFK";
      tableName: string;
      fkName: string;
      backup: ForeignKeySchema;
    }
  | { kind: "addUnique"; tableName: string; unique: UniqueConstraintSchema }
  | {
      kind: "dropUnique";
      tableName: string;
      uniqueName: string;
      backup: UniqueConstraintSchema;
    }
  | { kind: "addCheck"; tableName: string; check: CheckConstraintSchema }
  | {
      kind: "dropCheck";
      tableName: string;
      checkName: string;
      backup: CheckConstraintSchema;
    }
  | {
      kind: "changePrimaryKey";
      tableName: string;
      before: string[];
      after: string[];
    };
