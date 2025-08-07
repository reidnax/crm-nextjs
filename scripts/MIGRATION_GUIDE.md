# Database Migration Guide

This guide will help you migrate data from your old database to the new Prisma-based schema.

## 📋 Overview

Your old database has been analyzed and contains:

- **8 tables**: Users, Leads, Meetings, Tasks, Notes, Messages, Lead_Backup, SequelizeMeta
- **11 indexes**: Primary keys and performance indexes
- **0 foreign keys**: The old schema doesn't have explicit foreign key constraints
- **6 sequences**: Auto-increment sequences
- **2 views**: Database views
- **2 functions**: Stored procedures

## 🔄 Migration Process

### Step 1: Extract Old Schema (✅ Completed)

```bash
pnpm run extract:old-schema
```

This creates `scripts/old-database-schema.json` with complete schema information.

### Step 2: Review Schema Differences

**Old Schema vs New Schema:**

| Table    | Old Schema | New Schema           | Status      |
| -------- | ---------- | -------------------- | ----------- |
| Users    | 11 columns | 18 columns           | ✅ Enhanced |
| Leads    | 25 columns | 32 columns           | ✅ Enhanced |
| Meetings | 10 columns | 18 columns           | ✅ Enhanced |
| Tasks    | 8 columns  | 18 columns           | ✅ Enhanced |
| Notes    | 7 columns  | 15 columns           | ✅ Enhanced |
| Messages | 21 columns | ❌ Not in new schema | ⚠️ Skipped  |

**Key Enhancements in New Schema:**

- **RBAC System**: User permissions, roles, audit logs
- **Enhanced Fields**: Priority, tags, social media, lead scoring
- **Better Relationships**: Proper foreign key constraints
- **Audit Trail**: Permission audit logs
- **Resource Ownership**: Explicit resource ownership tracking

### Step 3: Run Data Migration

```bash
# Make sure your new database is ready
pnpm run db:migrate

# Run the data migration
pnpm run migrate:old-data
```

### Step 4: Set Up RBAC System

```bash
# Set up permissions, roles, and resource ownerships
pnpm run setup:rbac
```

## 📊 Migration Script Features

The migration script (`scripts/migrate-old-data.js`) includes:

### ✅ **Safety Features**

- **Duplicate Detection**: Checks for existing records before migration
- **Error Handling**: Continues migration even if individual records fail
- **Detailed Logging**: Creates `migration-log.json` with complete results
- **Transaction Safety**: Handles each record individually

### 🔄 **Data Mapping**

**Users Migration:**

- Maps all existing user fields
- Sets default values for new fields (avatar, department, etc.)
- Handles password migration (you may want to update passwords)

**Leads Migration:**

- Preserves all existing lead data
- Adds new fields with sensible defaults
- Maps numeric fields (annualRevenue, investmentLimit)

**Meetings Migration:**

- Migrates all meeting data
- Sets default status and type values
- Preserves relationships with leads

**Tasks Migration:**

- Migrates all task data
- Sets default priority and status
- Maps assignedTo to createdBy initially

**Notes Migration:**

- Migrates all note data
- Sets default type and visibility
- Preserves lead relationships

### ⚠️ **Messages Table**

The Messages table from the old schema is not present in the new schema. You may need to:

1. Decide if you want to preserve message data
2. Create a custom migration for messages if needed
3. Or archive the messages data separately

## 🚀 Running the Migration

### Prerequisites

1. **New Database Ready**: Ensure your new database is migrated and ready
2. **Environment Variables**: Set up your database URLs
3. **Backup**: Always backup your data before migration

### Execute Migration

```bash
# 1. Ensure new database is ready
pnpm run db:migrate

# 2. Run the migration
pnpm run migrate:old-data

# 3. Check the results
cat scripts/migration-log.json
```

### Expected Output

```
🔄 Migrating Users...
Found 5 users to migrate
✅ Migrated user: user1@example.com
✅ Migrated user: user2@example.com

🔄 Migrating Leads...
Found 150 leads to migrate
✅ Migrated lead: John Doe
✅ Migrated lead: Jane Smith

📊 Summary:
   Total records processed: 200
   Successful migrations: 195
   Failed migrations: 5
📝 Detailed log saved to: scripts/migration-log.json
```

## 🔍 Post-Migration Steps

### 1. Verify Data Integrity

```bash
# Check migration log for any errors
cat scripts/migration-log.json | jq '.errors'

# Verify record counts
cat scripts/migration-log.json | jq '.tables'
```

### 2. Update User Passwords

The migration sets default passwords. Update them:

```sql
-- Update passwords for migrated users
UPDATE "Users" SET password = 'new_hashed_password' WHERE password = 'default_password_123';
```

### 3. Set Up RBAC Permissions

```bash
# Set up the complete RBAC system
pnpm run setup:rbac
```

### 4. Test the Application

- Verify all data is accessible
- Test user authentication
- Check lead relationships
- Verify meeting and task assignments

## 🛠️ Troubleshooting

### Common Issues

**1. Connection Errors**

```bash
# Check database URLs
echo $DATABASE_URL
echo $OLD_DATABASE_URL
```

**2. Duplicate Records**

- The script automatically skips duplicates
- Check the migration log for skipped records

**3. Foreign Key Errors**

- Ensure all referenced users exist
- Check lead IDs in meetings/tasks/notes

**4. Data Type Mismatches**

- The script handles most type conversions
- Check the migration log for specific errors

### Manual Data Fixes

If you need to manually fix data:

```sql
-- Fix user assignments
UPDATE "Leads" SET "assign" = NULL WHERE "assign" NOT IN (SELECT id FROM "Users");

-- Fix lead references
UPDATE "Meetings" SET "leadId" = NULL WHERE "leadId" NOT IN (SELECT id FROM "Leads");

-- Update default values
UPDATE "Leads" SET "priority" = 'Medium' WHERE "priority" IS NULL;
```

## 📈 Performance Considerations

- **Large Datasets**: The script processes records one by one for safety
- **Memory Usage**: Minimal memory footprint
- **Network**: Uses SSL connections for security
- **Timeout**: Consider increasing timeout for large datasets

## 🔒 Security Notes

- **Passwords**: Update default passwords after migration
- **SSL**: All connections use SSL encryption
- **Logs**: Migration logs may contain sensitive data
- **Backup**: Always backup before migration

## 📞 Support

If you encounter issues:

1. Check the migration log: `scripts/migration-log.json`
2. Review the schema comparison: `scripts/old-database-schema.json`
3. Check database connectivity
4. Verify environment variables

The migration script is designed to be safe and reversible. Always test on a copy of your data first!
