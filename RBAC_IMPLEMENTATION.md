# 🛡️ **Role-Based Access Control (RBAC) System Implementation**

## **📋 Overview**

A comprehensive RBAC system has been implemented with granular permissions, audit logging, and hierarchical role management. The system provides secure, scalable access control across all application features.

---

## **🎯 Key Features**

### **✅ Completed Features**

1. **📊 Database Schema**: New tables for permissions, role assignments, user permissions, audit logs, and resource ownership
2. **🔐 Permission Matrix**: 73 granular permissions across 12 categories
3. **👥 Role Hierarchy**: Admin > Admin-Dev > Manager > Assignee with role-based restrictions
4. **🛠️ Middleware System**: API route protection with automatic audit logging
5. **⚛️ React Components**: Permission gates, role gates, and resource gates for UI protection
6. **📋 Audit Logging**: Comprehensive tracking of all permission changes and system access
7. **🏢 Department Hierarchy**: Manager-subordinate relationships with department-based permissions
8. **📱 Frontend Integration**: Permission-aware UI components throughout the application

---

## **🗂️ File Structure**

```
crm-nextjs/
├── src/
│   ├── lib/
│   │   ├── permissions/
│   │   │   ├── permission-matrix.ts      # Permission definitions & role mappings
│   │   │   ├── core.ts                  # PermissionManager & RoleHierarchy classes
│   │   │   ├── audit-service.ts         # Audit logging functionality
│   │   │   └── seed-permissions.ts      # Database seeding script
│   │   ├── middleware/
│   │   │   └── permission-middleware.ts # API route protection decorators
│   │   └── permissions.ts              # Legacy permission utilities (backwards compatible)
│   ├── contexts/
│   │   └── PermissionContext.tsx       # React context for frontend permissions
│   ├── components/
│   │   └── auth/
│   │       ├── PermissionGate.tsx      # Permission-based UI protection
│   │       ├── RoleGate.tsx           # Role-based UI protection
│   │       └── ResourceGate.tsx       # Resource ownership UI protection
│   ├── app/
│   │   ├── api/
│   │   │   ├── permissions/           # Permission checking API routes
│   │   │   └── admin/                # Admin-only API routes
│   │   └── admin/
│   │       └── audit/                # Admin audit logs page
│   └── prisma/
│       └── schema.prisma             # Updated with RBAC tables
```

---

## **🎭 Role System**

### **Role Hierarchy (Numeric Levels)**

| Role          | Level | Description                                          |
| ------------- | ----- | ---------------------------------------------------- |
| **Admin**     | 100   | Full system access, can manage all users and data    |
| **Admin-Dev** | 100   | Same as Admin with developer-specific permissions    |
| **Manager**   | 50    | Department-level access, can manage subordinates     |
| **Assignee**  | 10    | Basic user, can only access assigned/owned resources |

### **Permission Categories**

1. **👥 User Management** (12 permissions)
2. **📈 Lead Management** (15 permissions)
3. **📅 Meeting Management** (8 permissions)
4. **✅ Task Management** (8 permissions)
5. **📝 Note Management** (8 permissions)
6. **👨‍👩‍👧‍👦 Team Management** (5 permissions)
7. **📊 Data & Reports** (6 permissions)
8. **⚙️ System Settings** (4 permissions)
9. **📱 Dashboard Access** (3 permissions)
10. **🔍 Audit & Security** (2 permissions)
11. **🔐 Permission Management** (2 permissions)

---

## **🗄️ Database Schema**

### **New Tables Added**

```sql
-- Core permission system
Permissions               # Permission definitions
RolePermissions          # Role-to-permission mappings
UserPermissions          # User-specific permission overrides
PermissionAuditLogs      # Audit trail for all changes
ResourceOwnerships       # Resource ownership tracking

-- Enhanced user relationships
Users.managerId          # Manager hierarchy
```

### **Key Relationships**

- **Users** → **Users** (Manager-Subordinate)
- **Users** → **UserPermissions** (Custom permissions)
- **Users** → **PermissionAuditLogs** (Audit trail)
- **Users** → **ResourceOwnerships** (Owned resources)
- **Permissions** → **RolePermissions** (Role assignments)

---

## **🔧 API Protection**

### **Middleware Decorators**

```typescript
// Permission-based protection
@withPermissions(['leads.create', 'leads.update.all'])

// Role-based protection
@withRoles(['Admin', 'Manager'])

// Resource ownership protection
@withResourceOwnership('lead')

// Simple authentication
@withAuth()
```

### **Permission-Enhanced API Routes**

- **`/api/leads`** - Permission-filtered lead access
- **`/api/team`** - Role-based team management
- **`/api/permissions/*`** - Permission checking endpoints
- **`/api/admin/*`** - Admin-only functionality

---

## **⚛️ Frontend Components**

### **Permission Gates**

```tsx
// Single permission check
<PermissionGate permission="leads.create">
  <CreateLeadButton />
</PermissionGate>

// Multiple permissions (any)
<PermissionGate permissions={['leads.export.all', 'leads.export.assigned']} requireAll={false}>
  <ExportButton />
</PermissionGate>

// Role-based access
<RoleGate roles={['Admin', 'Manager']}>
  <AdminPanel />
</RoleGate>

// Resource ownership
<ResourceGate resourceType="lead" resourceId={leadId} action="update" ownershipRequired>
  <EditButton />
</ResourceGate>
```

### **Permission Hooks**

```tsx
// Check permissions in components
const { hasPermission, hasRole } = usePermissions();
const canEdit = hasPermission("leads.update.all");
const isAdmin = hasRole(["Admin", "Admin-Dev"]);

// Resource access checking
const { canAccess, loading } = useCanAccess("lead", leadId, "update");
```

---

## **📊 Permission Matrix Highlights**

### **Admin Permissions** (Full Access)

- All 73 permissions across all categories
- Complete system administration capabilities
- User role management and permission overrides

### **Manager Permissions** (Department Scope)

- User management within department
- Full lead/meeting/task/note access
- Team management for subordinates
- Department-level reporting and data export

### **Assignee Permissions** (Owned/Assigned Only)

- Personal profile management
- Access only to assigned/created resources
- Basic reporting on personal data
- Personal dashboard access

---

## **🔍 Audit System**

### **Tracked Events**

- **Permission Changes**: Grants, revokes, role changes
- **Authentication**: Login, logout, failed attempts
- **Resource Access**: Create, read, update, delete operations
- **Administrative Actions**: User management, system changes

### **Audit Data**

- **Who**: User performing the action
- **What**: Specific action and affected resources
- **When**: Timestamp of the action
- **Where**: IP address and user agent
- **Why**: Context and permission basis
- **Changed By**: For administrative actions

### **Admin Audit Dashboard**

- Real-time audit log viewing with filtering
- Statistical dashboards for security monitoring
- Export capabilities for compliance reporting
- Advanced search and pagination

---

## **🚀 Usage Examples**

### **API Route Protection**

```typescript
// Before: Basic auth check
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return errorResponse("Unauthorized", 401);
  // ... handler logic
}

// After: Permission-based protection
export const POST = withPermissions(["leads.create"])(
  async (request: NextRequest) => {
    const user = getCurrentUser(request);
    // ... handler logic with automatic permission verification
  }
);
```

### **Frontend UI Protection**

```tsx
// Before: Role-based checks
{
  isAdminRole(userRole) && <AdminButton />;
}

// After: Permission-based checks
<PermissionGate permission="users.create">
  <AdminButton />
</PermissionGate>;
```

### **Data Filtering**

```typescript
// Automatic permission-based filtering in API
const hasViewAllLeads = await PermissionManager.hasPermission(
  userId,
  "leads.read.all"
);

if (!hasViewAllLeads) {
  // Apply user-specific filters
  where.OR = [
    { assign: userId }, // Assigned leads
    { createdBy: userId }, // Created leads
    { assignee: { department: userDepartment } }, // Department leads (managers)
  ];
}
```

---

## **🛠️ Setup & Installation**

### **1. Database Migration**

```bash
# Generate and apply Prisma migration
pnpm prisma generate
pnpm prisma db push
```

### **2. Seed Permission System**

```bash
# Populate permissions and role mappings
npx tsx src/lib/permissions/seed-permissions.ts
```

### **3. Environment Setup**

Ensure the `PermissionProvider` is wrapping your app in the main layout:

```tsx
import { PermissionProvider } from "@/contexts/PermissionContext";

return <PermissionProvider>{/* Your app content */}</PermissionProvider>;
```

---

## **🔧 Maintenance & Administration**

### **Adding New Permissions**

1. **Define in Permission Matrix**: Add to `PERMISSIONS` object in `permission-matrix.ts`
2. **Assign to Roles**: Update `ROLE_PERMISSIONS` mappings
3. **Reseed Database**: Run the seed script to update the database
4. **Update UI**: Add permission gates to relevant UI components

### **Creating New Roles**

1. **Define Role**: Add to `RoleHierarchy.hierarchy` with appropriate level
2. **Assign Permissions**: Update `ROLE_PERMISSIONS` mapping
3. **Update Role Lists**: Add to role dropdowns in forms
4. **Test Access**: Verify permission inheritance works correctly

### **Permission Debugging**

```typescript
// Check user permissions programmatically
const permissions = await PermissionManager.getUserPermissions(userId);
console.log("User permissions:", permissions);

// Check specific permission with context
const hasPermission = await PermissionManager.hasPermission(
  userId,
  "leads.update.assigned",
  { resourceType: "lead", resourceId: 123 }
);
```

---

## **📈 Performance Considerations**

### **Optimizations Implemented**

1. **Permission Caching**: Frontend permissions cached in React context
2. **Database Indexing**: Optimized indexes on permission lookup tables
3. **Bulk Operations**: Batch permission checks where possible
4. **Lazy Loading**: Permission gates only check when rendered

### **Monitoring**

- **Audit Log Growth**: Regular cleanup of old audit logs (365-day retention)
- **Permission Queries**: Monitor for N+1 queries in permission checks
- **API Performance**: Track permission middleware overhead

---

## **🔐 Security Features**

### **Protection Layers**

1. **Database Level**: Foreign key constraints and data validation
2. **API Level**: Middleware-based permission checking
3. **Frontend Level**: UI component permission gates
4. **Audit Level**: Comprehensive logging of all access attempts

### **Security Best Practices**

- **Principle of Least Privilege**: Users get minimal required permissions
- **Defense in Depth**: Multiple layers of permission checking
- **Audit Trail**: Complete logging for security monitoring
- **Role Separation**: Clear separation between admin and user capabilities

---

## **🎉 Migration Impact**

### **✅ Backwards Compatibility**

- All existing functionality continues to work
- Legacy permission functions still available
- Gradual migration path for existing code
- No breaking changes to current user workflows

### **🔄 Data Preservation**

- All existing user data preserved
- Resource ownership automatically calculated from existing data
- Role assignments maintained from current user roles
- No data loss during migration

### **📊 Enhanced Capabilities**

- Granular permission control
- Department-based access management
- Comprehensive audit trails
- Advanced admin tools

---

## **📞 Support & Documentation**

For questions about the RBAC system:

1. **Permission Issues**: Check the audit logs in `/admin/audit`
2. **Role Problems**: Verify role hierarchy in `permission-matrix.ts`
3. **UI Access**: Ensure permission gates are properly configured
4. **API Errors**: Check middleware configuration and permission assignments

The system is designed to be self-documenting through the audit logs and provides clear error messages for permission-related issues.
