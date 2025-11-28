export type ScalarType =
  | "string"
  | "text"
  | "integer"
  | "bigint"
  | "boolean"
  | "date"
  | "dateTime"
  | "float"
  | "decimal"
  | "json"
  | "uuid"
  | "enum";

export type ColumnSchema = {
  name: string;
  type: ScalarType;
  dbType: string;         // raw DB type, e.g. "VARCHAR(255)" or "ENUM('A','B')"
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
  onUpdate?: string | null;
  onDelete?: string | null;
};

export type TableSchema = {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
};

export type DatabaseSchema = {
  tables: TableSchema[];
  enums: {
    // key: enum name, value: allowed values
    [name: string]: string[];
  };
};

export type MigrationAction =
  | { kind: "createTable"; table: TableSchema }
  | { kind: "dropTable"; tableName: string }
  | {
      kind: "addColumn";
      tableName: string;
      column: ColumnSchema;
    }
  | {
      kind: "dropColumn";
      tableName: string;
      columnName: string;
    }
  | {
      kind: "alterColumn";
      tableName: string;
      before: ColumnSchema;
      after: ColumnSchema;
    }
  | {
      kind: "createIndex";
      tableName: string;
      index: IndexSchema;
    }
  | {
      kind: "dropIndex";
      tableName: string;
      indexName: string;
    }
  | {
      kind: "addForeignKey";
      tableName: string;
      fk: ForeignKeySchema;
    }
  | {
      kind: "dropForeignKey";
      tableName: string;
      fkName: string;
    }
  | {
      kind: "createEnum";
      name: string;
      values: string[];
    }
  | {
      kind: "alterEnum";
      name: string;
      before: string[];
      after: string[];
    }
  | {
      kind: "dropEnum";
      name: string;
    };
