# 🚀 Production Deployment Guide

## Prerequisites

- PostgreSQL database server
- Node.js 18+
- pnpm package manager

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/production_db"

# NextAuth.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secure-random-secret-here"

# Optional: Analytics, monitoring, etc.
```

## Step-by-Step Deployment

### 1. Database Setup

```bash
# Create the production database
createdb production_db

# Or via SQL
psql -c "CREATE DATABASE production_db;"
```

### 2. Install Dependencies

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
pnpm prisma generate
```

### 3. Run Database Migrations

```bash
# Deploy migrations to production database
pnpm prisma migrate deploy

# This will run:
# - 20250807033743_baseline_with_enhanced_fields
# - 20250807042330_add_rbac_system
```

### 4. Seed RBAC System

```bash
# Populate permissions and role mappings
npx tsx src/lib/permissions/seed-permissions.ts
```

### 5. Build Application

```bash
# Build the Next.js application
pnpm build
```

### 6. Start Production Server

```bash
# Start the production server
pnpm start
```

## Migration Files Included

### 20250807033743_baseline_with_enhanced_fields

- Base CRM tables (Users, Leads, Meetings, Tasks, Notes)
- Enhanced field structure
- Indexes and foreign keys

### 20250807042330_add_rbac_system ⭐️ **NEW**

- **Permissions** table (73 granular permissions)
- **RolePermissions** table (role-to-permission mappings)
- **UserPermissions** table (user-specific permission overrides)
- **ResourceOwnerships** table (ownership tracking)
- **PermissionAuditLogs** table (audit trail)
- **Users.managerId** field (manager hierarchy)

## RBAC System Features

✅ **Granular Permissions**: 73 specific permissions across 12 categories
✅ **Role Hierarchy**: Admin > Admin-Dev > Manager > Assignee  
✅ **Resource Ownership**: Track who owns/created resources
✅ **Audit Logging**: Complete access and change tracking
✅ **Manager Hierarchy**: Support for reporting structures
✅ **Permission Overrides**: User-specific permission grants/revokes

## Verification Steps

After deployment, verify the system:

```bash
# Check migration status
pnpm prisma migrate status

# Verify tables exist
psql $DATABASE_URL -c "\dt"

# Check RBAC tables
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Permissions\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"RolePermissions\";"
```

## Post-Deployment

1. **Create Admin User**: Use the Team page to create your first admin user
2. **Test Permissions**: Verify role-based access works correctly
3. **Check Audit Logs**: Navigate to Admin → Audit Logs
4. **Monitor Performance**: Check database queries and optimize if needed

## Rollback Plan

If needed, you can rollback migrations:

```bash
# Rollback to previous migration (removes RBAC)
pnpm prisma migrate reset

# Then re-apply baseline
pnpm prisma migrate deploy
```

## Security Notes

- 🔒 All API routes are protected by permission middleware
- 🔍 All user actions are logged for audit purposes
- 🛡️ Role hierarchy prevents privilege escalation
- 📊 Dashboard and leads have role-based data filtering

## Support

The RBAC system is fully backward compatible - all existing functionality works with enhanced permission controls.

---

**Database migrations are production-ready and include no breaking changes!** ✅
