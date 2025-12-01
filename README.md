# SeqMig

A powerful auto-migration CLI tool for Sequelize that automatically generates and manages database migrations based on your model changes.

## Overview

SeqMig simplifies database schema management by automatically detecting changes in your Sequelize models and generating migration files. It uses `sequelize-cli` internally for migration execution while providing an intelligent schema introspection and diff system.

## Features

- **Automatic Migration Generation** - Detects model changes and generates migration files automatically
- **Schema Snapshots** - Maintains snapshots of your database schema for accurate diff detection
- **Smart Column Rename Detection** - Intelligently detects renamed columns based on similarity
- **Relationship Handling** - Properly manages foreign keys, indexes, and constraints
- **Backup System** - Automatic snapshot backups with restore capability
- **Schema Validation** - Verify that your snapshot matches the actual database state
- **TypeScript Support** - Full TypeScript support with `.ts` and `.js` model files

## Installation

```bash
npm install seqmig
```

## Quick Start

1. **Initialize configuration**

```bash
seqmig init
```

This creates a `.sequelizerc` file in your project root with default paths:

```javascript
{
  config: "config/config.js",
  "models-path": "models",
  "migrations-path": "migrations",
  "seeders-path": "seeders"
}
```

2. **Preview schema changes**

```bash
seqmig preview
```

3. **Generate migration**

```bash
seqmig generate
```

4. **Run migrations**

```bash
seqmig run
```

## Commands

### `seqmig init`

Initialize `.sequelizerc` configuration file with default paths.

### `seqmig preview`

Preview the schema differences between your current models and the last snapshot. Shows what migrations would be generated without actually creating them.

### `seqmig generate`

Generate a migration file based on detected schema changes. Updates the snapshot after generation.

### `seqmig run`

Execute all pending migrations using `sequelize-cli db:migrate`.

### `seqmig rollback`

Rollback the last applied migration using `sequelize-cli db:migrate:undo`.

### `seqmig rebuild`

Rebuild the schema snapshot from the current database state. Useful when starting with an existing database or after manual schema changes.

### `seqmig validate`

Validate that the current snapshot matches the actual database schema. Shows any discrepancies if found.

### `seqmig introspect`

Introspect and output the current database schema as JSON. Useful for debugging and understanding how SeqMig sees your schema.

### `seqmig backups`

List all available snapshot backups.

### `seqmig restore <backup>`

Restore a specific snapshot backup by filename.

## How It Works

1. **Schema Introspection**: SeqMig reads your Sequelize models and extracts the complete schema including columns, indexes, foreign keys, unique constraints, and check constraints.
2. **Snapshot Management**: The current schema is stored as a JSON snapshot in `.seqmig/snapshots/schema-snapshot.json`. Each time you generate a migration, a backup is created.
3. **Diff Detection**: When you run `seqmig preview` or `seqmig generate`, it compares the current model schema with the saved snapshot to detect changes.
4. **Smart Rename Detection**: SeqMig uses similarity algorithms to detect column renames rather than treating them as drop + add operations.
5. **Migration Generation**: Changes are converted into Sequelize migration operations and written to a timestamped migration file in your migrations directory.
6. **Migration Execution**: Uses `sequelize-cli` to apply migrations to your database.

## Configuration

SeqMig uses the standard `.sequelizerc` file for configuration. You can customize:

```javascript
const path = require("path");

module.exports = {
  config: path.resolve("config/config.js"),
  "models-path": path.resolve("models"),
  "migrations-path": path.resolve("migrations"),
  "seeders-path": path.resolve("seeders"),
  url: process.env.DATABASE_URL, // Optional: direct connection string
  debug: false, // Optional: enable debug logging
  "tsconfig-path": path.resolve("tsconfig.json"), // Optional: custom tsconfig
};
```

## Supported Schema Elements

- Tables (create, drop)
- Columns (add, drop, alter, rename)
- Primary Keys
- Foreign Keys
- Indexes
- Unique Constraints
- Check Constraints
- Data Types (including ENUMs and ARRAYs)
- Default Values
- Auto-increment

## Example Workflow

```bash
# Initialize SeqMig
seqmig init

# Create initial snapshot
seqmig rebuild

# Make changes to your models
# Preview what will change
seqmig preview

# Generate migration
seqmig generate

# Review the generated migration file
# Run migrations
seqmig run

# If something goes wrong, rollback
seqmig rollback
```

## Migration File Structure

Generated migrations use transactions for safety:

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Migration operations here
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Rollback operations here
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
```

## Backup and Recovery

SeqMig automatically maintains up to 20 snapshot backups. Each backup is timestamped and stored in `.seqmig/snapshots/backups/`.

```bash
# List available backups
seqmig backups

# Restore a specific backup
seqmig restore snapshot-2024-12-01T10-30-00-000Z.json
```

## Best Practices

- Always preview before generating using `seqmig preview`
- Review generated migrations before running them
- Commit both migration files and snapshots to version control
- Run `seqmig rebuild` after manual database modifications
- Use `seqmig validate` regularly to ensure snapshot consistency
- Test migrations in a development environment first

## Troubleshooting

### Snapshot out of sync

```bash
seqmig validate  # Check for discrepancies
seqmig rebuild   # Rebuild from current database state
```

### Migration conflicts

```bash
seqmig rollback  # Rollback the problematic migration
# Fix the issue
seqmig generate  # Generate new migration
seqmig run       # Try again
```

### Model loading issues

Ensure your models are properly exported and located in the configured `models-path`.

## Limitations

- **PostgreSQL only** - Primarily designed for PostgreSQL; other databases (MySQL, SQLite, MSSQL) have limited or no support.
- **Imperfect rename detection** - Column and table renames may be misidentified as drop+add operations, risking data loss.
- **No support for views** - Database views are completely ignored and not migrated.
- **No support for stored procedures/functions** - Database functions, procedures, and triggers are not handled.
- **Manual sync required** - Any database changes made outside SeqMig require manually running `seqmig rebuild`.
- **No git branch awareness** - Single linear snapshot causes conflicts when working across multiple branches.
- **No concurrent operation support** - Multiple developers generating migrations simultaneously can corrupt snapshots.
- **ENUM changes need manual handling** - Adding/removing ENUM values may require manual migration adjustments.
- **Junction table detection is heuristic-based** - May not correctly identify all many-to-many relationships.
- **No migration preview for execution** - `seqmig run` executes immediately; must use `seqmig preview` before generating.
- **No automatic drift detection** - Must manually run `seqmig validate` to check if snapshot is out of sync.
- **Complex default values may fail** - Default values using complex functions may not serialize correctly.
- **Dynamic models not supported** - Only file-based models can be introspected; runtime-created models are invisible.

## Requirements

- Node.js >= 16
- Sequelize >= 6
- sequelize-typescript >= 2
- PostgreSQL (currently the primary supported dialect)

## License

ISC

## Author

Sandip Shrestha (sandipstha139@gmail.com)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Links

- [Sequelize Documentation](https://sequelize.org/)
- [sequelize-cli Documentation](https://github.com/sequelize/cli)
