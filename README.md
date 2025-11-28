# Sequelize Auto-Migration System

This project provides an automated migration system built on top of Sequelize and sequelize-typescript.

It generates database migrations based on model definitions, ensures schema consistency, and offers a complete CLI workflow for generating, previewing, applying, and rolling back migrations.

The goal of this system is to allow model-driven schema evolution without manually writing SQL migrations.

---

## Features

### Automated Introspection

Reads all Sequelize models and extracts:

- Tables
- Columns
- Data types
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- ENUM types

### Schema Diff Engine

Detects changes between:

1. The previously stored schema snapshot, and
2. The newly introspected schema

It produces a structured list of migration actions.

### Migration Generator

Generates migration files that can:

- Create tables
- Drop tables
- Add columns
- Drop columns
- Alter columns
- Create indexes
- Drop indexes
- Add foreign keys
- Drop foreign keys
- Add unique constraints
- Drop unique constraints
- Create ENUM types
- Alter ENUM types by adding values
- Drop ENUM types

### CLI Tooling

Provides commands for:

- Generating migrations
- Previewing migration actions without generating files
- Running all pending migrations
- Rolling back the last migration

### Sequelize-CLI Compatible

Generated migrations are compatible with `sequelize-cli`, ensuring reliable execution.

---

## Limitations

This system is designed for PostgreSQL only and relies on Sequelize metadata.
The following limitations apply:

- Removing ENUM values is not performed automatically (PostgreSQL restriction)
- ENUM type restructuring (such as reordering values) requires manual editing
- Many-to-many relationships without an explicit through model are not automatically detected
- Check constraints and exclusion constraints are not extracted because Sequelize does not expose them in model metadata
- Advanced PostgreSQL features outside Sequelize’s metadata (such as triggers, rules, partitioning) are not included
- Complex changes to composite primary keys may require manual review

---

## Project Structure

```
src/
├── config/
│   ├── sequelize.ts
│   └── sequelize-config.cjs
│
├── database/
│   └── models/
│       ├── user.model.ts
│       ├── profile.model.ts
│       └── post.model.ts
│
├── migration/
│   ├── schema-types.ts
│   ├── introspect.ts
│   ├── diff.ts
│   ├── generator.ts
│   ├── migrate.ts
│   └── cli.ts
│
├── migrations/
│   └── <timestamp>-auto-migration.js
│
└── tools/
    └── migrate.ts
```

---

## Installation

Install dependencies:

```
pnpm install
```

Ensure the database connection settings in `src/config/sequelize-config.cjs` are correct.

---

## Package Scripts

The project exposes the following commands through `package.json`:

| Script               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `migration:generate` | Generate a new migration file based on schema diff       |
| `migration:preview`  | Show planned migration actions without generating a file |
| `migration:run`      | Apply all pending migrations                             |
| `migration:rollback` | Revert the last applied migration                        |

Example script definitions:

```json
{
  "scripts": {
    "migration:generate": "ts-node src/tools/migrate.ts generate",
    "migration:preview": "ts-node src/tools/migrate.ts preview",
    "migration:run": "ts-node src/tools/migrate.ts run",
    "migration:rollback": "ts-node src/tools/migrate.ts rollback"
  }
}
```

---

## How the System Works

### 1. Introspection

Model metadata is collected from sequelize-typescript models.

### 2. Schema Comparison

The diff engine compares the new schema with the previously saved schema snapshot.

### 3. Migration Generation

A migration file is generated based on detected changes.

### 4. Execution

Migrations are executed using `sequelize-cli` to ensure reliability.

### 5. Rollback

The last migration can be reverted when necessary.

---

## Example Migration Output

```javascript
await queryInterface.createTable("users", {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: Sequelize.STRING, unique: true },
  status: Sequelize.ENUM("active", "disabled"),
});

await queryInterface.addConstraint("profiles", {
  type: "foreign key",
  fields: ["userId"],
  references: { table: "users", field: "id" },
});
```

---

## Supported Features

### Tables

- Creation
- Removal

### Columns

- Addition
- Removal
- Modification

### Indexes

- Creation
- Removal

### Foreign Keys

- Addition
- Removal

### Unique Constraints

- Addition
- Removal

### ENUM Types

- Creation
- Value addition
- Removal
