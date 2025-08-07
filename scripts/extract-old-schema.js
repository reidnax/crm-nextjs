const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Configuration - Update these values with your old database details
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;

async function extractDatabaseSchema() {
  const client = new Client({
    connectionString: OLD_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected to old database successfully");

    const schema = {
      tables: [],
      indexes: [],
      foreignKeys: [],
      sequences: [],
      views: [],
      functions: [],
    };

    // Get all tables
    const tablesQuery = `
      SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        c.udt_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `;

    const tablesResult = await client.query(tablesQuery);

    // Group columns by table
    const tableMap = new Map();
    tablesResult.rows.forEach((row) => {
      if (!tableMap.has(row.table_name)) {
        tableMap.set(row.table_name, {
          name: row.table_name,
          columns: [],
        });
      }

      if (row.column_name) {
        tableMap.get(row.table_name).columns.push({
          name: row.column_name,
          type: row.data_type,
          maxLength: row.character_maximum_length,
          nullable: row.is_nullable === "YES",
          defaultValue: row.column_default,
          position: row.ordinal_position,
          udtName: row.udt_name,
        });
      }
    });

    schema.tables = Array.from(tableMap.values());

    // Get primary keys
    const primaryKeysQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_schema = 'public'
    `;

    const primaryKeysResult = await client.query(primaryKeysQuery);
    const primaryKeysMap = new Map();

    primaryKeysResult.rows.forEach((row) => {
      if (!primaryKeysMap.has(row.table_name)) {
        primaryKeysMap.set(row.table_name, []);
      }
      primaryKeysMap.get(row.table_name).push(row.column_name);
    });

    // Add primary key info to tables
    schema.tables.forEach((table) => {
      table.primaryKeys = primaryKeysMap.get(table.name) || [];
    });

    // Get indexes
    const indexesQuery = `
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON ix.indexrelid = i.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r' 
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.relname, i.relname, a.attnum
    `;

    const indexesResult = await client.query(indexesQuery);
    const indexesMap = new Map();

    indexesResult.rows.forEach((row) => {
      const key = `${row.table_name}_${row.index_name}`;
      if (!indexesMap.has(key)) {
        indexesMap.set(key, {
          tableName: row.table_name,
          name: row.index_name,
          columns: [],
          isUnique: row.is_unique,
          isPrimary: row.is_primary,
        });
      }
      indexesMap.get(key).columns.push(row.column_name);
    });

    schema.indexes = Array.from(indexesMap.values());

    // Get foreign keys
    const foreignKeysQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
    `;

    const foreignKeysResult = await client.query(foreignKeysQuery);
    schema.foreignKeys = foreignKeysResult.rows.map((row) => ({
      tableName: row.table_name,
      columnName: row.column_name,
      foreignTableName: row.foreign_table_name,
      foreignColumnName: row.foreign_column_name,
      constraintName: row.constraint_name,
      updateRule: row.update_rule,
      deleteRule: row.delete_rule,
    }));

    // Get sequences
    const sequencesQuery = `
      SELECT 
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `;

    const sequencesResult = await client.query(sequencesQuery);
    schema.sequences = sequencesResult.rows;

    // Get views
    const viewsQuery = `
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
    `;

    const viewsResult = await client.query(viewsQuery);
    schema.views = viewsResult.rows;

    // Get functions
    const functionsQuery = `
      SELECT 
        routine_name,
        routine_type,
        data_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
    `;

    const functionsResult = await client.query(functionsQuery);
    schema.functions = functionsResult.rows;

    // Save schema to file
    const outputPath = path.join(__dirname, "old-database-schema.json");
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

    console.log(`Schema extracted successfully to: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`- Tables: ${schema.tables.length}`);
    console.log(`- Indexes: ${schema.indexes.length}`);
    console.log(`- Foreign Keys: ${schema.foreignKeys.length}`);
    console.log(`- Sequences: ${schema.sequences.length}`);
    console.log(`- Views: ${schema.views.length}`);
    console.log(`- Functions: ${schema.functions.length}`);

    // Print table details
    console.log(`\nTables found:`);
    schema.tables.forEach((table) => {
      console.log(`- ${table.name} (${table.columns.length} columns)`);
    });
  } catch (error) {
    console.error("Error extracting schema:", error);
  } finally {
    await client.end();
  }
}

// Run the script
if (require.main === module) {
  extractDatabaseSchema().catch(console.error);
}

module.exports = { extractDatabaseSchema };
