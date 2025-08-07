# Database Schema Extraction Script

This script extracts the complete database structure from your old database to help with migration planning.

## Usage

### 1. Set up the old database connection

You need to provide the connection string for your old database. You can do this in two ways:

**Option A: Environment Variable (Recommended)**

```bash
export OLD_DATABASE_URL="postgresql://username:password@host:port/database_name"
```

**Option B: Modify the script directly**
Edit `scripts/extract-old-schema.js` and update the `OLD_DATABASE_URL` constant.

### 2. Run the extraction script

```bash
# Using pnpm (recommended)
pnpm run extract:old-schema

# Or using npm
npm run extract:old-schema

# Or run directly
node scripts/extract-old-schema.js
```

### 3. Check the output

The script will create `scripts/old-database-schema.json` with the complete schema information including:

- **Tables**: All table names, columns, data types, constraints
- **Indexes**: Primary keys, unique indexes, regular indexes
- **Foreign Keys**: All relationships between tables
- **Sequences**: Auto-increment sequences
- **Views**: Database views
- **Functions**: Stored procedures and functions

## Output Format

The generated JSON file contains:

```json
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "maxLength": 255,
          "nullable": true,
          "defaultValue": "default_value",
          "position": 1,
          "udtName": "udt_name"
        }
      ],
      "primaryKeys": ["id"]
    }
  ],
  "indexes": [
    {
      "tableName": "table_name",
      "name": "index_name",
      "columns": ["column_name"],
      "isUnique": false,
      "isPrimary": false
    }
  ],
  "foreignKeys": [
    {
      "tableName": "table_name",
      "columnName": "foreign_key_column",
      "foreignTableName": "referenced_table",
      "foreignColumnName": "referenced_column",
      "constraintName": "fk_constraint_name",
      "updateRule": "CASCADE",
      "deleteRule": "SET NULL"
    }
  ],
  "sequences": [...],
  "views": [...],
  "functions": [...]
}
```

## Troubleshooting

### Connection Issues

- Verify your database connection string
- Ensure the database is accessible from your machine
- Check if you need SSL configuration

### Permission Issues

- Make sure your database user has read access to `information_schema`
- For PostgreSQL, the user needs `USAGE` privilege on the schema

### Missing Dependencies

```bash
# Install pg if not already installed
pnpm add pg
```

## Next Steps

After extracting the schema:

1. **Compare schemas**: Compare the old schema with your new Prisma schema
2. **Plan migration**: Identify what needs to be migrated
3. **Create migration scripts**: Use the extracted schema to create data migration scripts
4. **Test migration**: Test the migration process on a copy of your data

## Example Usage

```bash
# Set your old database URL
export OLD_DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/old_crm"

# Run the extraction
pnpm run extract:old-schema

# Check the output
cat scripts/old-database-schema.json | jq '.tables[].name'
```
