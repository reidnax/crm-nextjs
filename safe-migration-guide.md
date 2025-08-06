# 🛡️ Safe Database Migration Guide

## Overview

Your enhanced CRM schema includes valuable improvements, but we need to migrate safely without losing existing data.

## Migration Options

### Option 1: 🎯 **Recommended - Use Prisma Migrate**

```bash
# 1. Generate migration instead of direct push
pnpm dlx prisma migrate dev --name enhanced_crm_schema

# 2. Review the generated migration file
# 3. Apply if satisfied
```

### Option 2: 🔄 **Selective Schema Updates**

Apply changes in phases to minimize risk:

```bash
# Phase 1: Add new columns only (non-breaking)
# Phase 2: Update existing columns
# Phase 3: Clean up old tables
```

### Option 3: ⚡ **Force Push with Backups**

If you're confident about the changes:

```bash
# 1. Run backup script first
psql -d crmdb -f backup-important-data.sql

# 2. Force push (ignoring warnings)
pnpm dlx prisma db push --force-reset
```

## What Each Warning Means

### ✅ **Safe Changes**

- **Decimal precision updates**: Adding explicit precision `Decimal(65,30)` won't lose data
- **New optional columns**: All our enhancements are optional fields

### ⚠️ **Data Loss Warnings**

- **`Lead_Backup` table**: Old Sequelize backup (safe to drop)
- **`Messages` table**: Excluded functionality (safe to drop per requirements)
- **`SequelizeMeta` table**: Sequelize migration history (safe to drop)

## Recommended Action Plan

1. **Backup Critical Data** (if needed)
2. **Use Prisma Migrate** for safer, tracked migrations
3. **Test in development** first if possible
4. **Apply to production** with confidence

## Enhanced Features You'll Get

✅ **Lead Enhancements**: Priority, tags, lead scoring, source tracking
✅ **Meeting Improvements**: Status, types, recurring meetings, agenda
✅ **Task Upgrades**: Categories, time tracking, better assignments  
✅ **Note Features**: Types, privacy, pinning, rich categorization
✅ **User Profiles**: Enhanced profile fields, preferences, department info

All changes are **non-breaking** and preserve existing functionality while adding powerful new features! 🚀
