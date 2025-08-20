/**
 * Permission Matrix Definition
 * Defines all permissions and their role assignments
 */

export const PERMISSIONS = {
  // User Management
  "users.create": "Create new users",
  "users.read.all": "View all users",
  "users.read.own": "View own profile",
  "users.read.department": "View department users",
  "users.update.all": "Edit all users",
  "users.update.own": "Edit own profile",
  "users.update.department": "Edit department users",
  "users.delete": "Deactivate users",
  "users.manage.roles": "Change user roles",
  "users.export": "Export user data",

  // Lead Management
  "leads.create": "Create new leads",
  "leads.read.all": "View all leads",
  "leads.read.assigned": "View assigned leads",
  "leads.read.team": "View team leads",
  "leads.read.department": "View department leads",
  "leads.update.all": "Edit all leads",
  "leads.update.assigned": "Edit assigned leads",
  "leads.update.team": "Edit team leads",
  "leads.update.department": "Edit department leads",
  "leads.delete.all": "Delete any leads",
  "leads.delete.assigned": "Delete assigned leads",
  "leads.assign.all": "Assign leads to anyone",
  "leads.assign.team": "Assign leads within team",
  "leads.assign.department": "Assign leads within department",
  "leads.export.all": "Export all leads",
  "leads.export.assigned": "Export assigned leads",
  "leads.export.department": "Export department leads",

  // Meeting Management
  "meetings.create": "Create new meetings",
  "meetings.read.all": "View all meetings",
  "meetings.read.assigned": "View assigned meetings",
  "meetings.read.department": "View department meetings",
  "meetings.update.all": "Edit all meetings",
  "meetings.update.assigned": "Edit assigned meetings",
  "meetings.delete.all": "Delete any meetings",
  "meetings.delete.assigned": "Delete assigned meetings",

  // Task Management
  "tasks.create": "Create new tasks",
  "tasks.read.all": "View all tasks",
  "tasks.read.assigned": "View assigned tasks",
  "tasks.read.department": "View department tasks",
  "tasks.update.all": "Edit all tasks",
  "tasks.update.assigned": "Edit assigned tasks",
  "tasks.delete.all": "Delete any tasks",
  "tasks.delete.assigned": "Delete assigned tasks",

  // Note Management
  "notes.create": "Create new notes",
  "notes.read.all": "View all notes",
  "notes.read.assigned": "View assigned notes",
  "notes.read.department": "View department notes",
  "notes.update.all": "Edit all notes",
  "notes.update.assigned": "Edit assigned notes",
  "notes.delete.all": "Delete any notes",
  "notes.delete.assigned": "Delete assigned notes",

  // Team Management
  "team.read.all": "View all team members",
  "team.read.department": "View department members",
  "team.manage.all": "Manage all team members",
  "team.manage.department": "Manage department members",
  "team.export": "Export team data",

  // Data & Reports
  "data.export.all": "Export all data",
  "data.export.department": "Export department data",
  "data.export.assigned": "Export assigned data",
  "reports.view.all": "View all reports",
  "reports.view.department": "View department reports",
  "reports.view.personal": "View personal reports",
  "reports.create": "Create custom reports",

  // Daily Activity Reports
  "reports.daily.create": "Submit daily activity reports",
  "reports.daily.read.all": "View all daily activity reports",
  "reports.daily.read.assigned": "View assigned daily activity reports",
  "reports.daily.analytics": "Access daily activity report analytics",

  // System Settings
  "settings.system": "Manage system settings",
  "settings.integrations": "Manage integrations",
  "settings.security": "Manage security settings",
  "settings.notifications": "Manage notification settings",

  // Dashboard
  "dashboard.view.all": "View company dashboard",
  "dashboard.view.department": "View department dashboard",
  "dashboard.view.personal": "View personal dashboard",

  // Audit & Admin
  "audit.view": "View audit logs",
  "permissions.manage": "Manage user permissions",
  "permissions.view": "View permission assignments",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Role-based permission assignments
 */
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  Admin: [
    // Full access to everything
    ...(Object.keys(PERMISSIONS) as PermissionKey[]),
  ],

  "Admin-Dev": [
    // Same as admin - full access
    ...(Object.keys(PERMISSIONS) as PermissionKey[]),
  ],

  Manager: [
    // User management (department scope)
    "users.read.all",
    "users.read.department",
    "users.update.own",
    "users.update.department",
    "users.export",

    // Lead management (department scope)
    "leads.create",
    "leads.read.all",
    "leads.read.department",
    "leads.update.all",
    "leads.update.department",
    "leads.assign.all",
    "leads.assign.department",
    "leads.export.all",
    "leads.export.department",

    // Meeting management (department scope)
    "meetings.create",
    "meetings.read.all",
    "meetings.read.department",
    "meetings.update.all",
    "meetings.delete.assigned",

    // Task management (department scope)
    "tasks.create",
    "tasks.read.all",
    "tasks.read.department",
    "tasks.update.all",
    "tasks.delete.assigned",

    // Note management (department scope)
    "notes.create",
    "notes.read.all",
    "notes.read.department",
    "notes.update.all",
    "notes.delete.assigned",

    // Team management (department scope)
    "team.read.all",
    "team.read.department",
    "team.manage.department",
    "team.export",

    // Reports (department scope)
    "reports.view.all",
    "reports.view.department",
    "reports.create",
    "data.export.department",

    // Daily Activity Reports (manager scope)
    "reports.daily.create",
    "reports.daily.read.all",
    "reports.daily.analytics",

    // Dashboard
    "dashboard.view.all",
    "dashboard.view.department",
    "dashboard.view.personal",

    // Limited permissions view
    "permissions.view",
  ],

  Assignee: [
    // Basic user permissions
    "users.read.own",
    "users.update.own",

    // Lead management (assigned only)
    "leads.create",
    "leads.read.assigned",
    "leads.update.assigned",
    "leads.export.assigned",

    // Meeting management (assigned only)
    "meetings.create",
    "meetings.read.assigned",
    "meetings.update.assigned",
    "meetings.delete.assigned",

    // Task management (assigned only)
    "tasks.create",
    "tasks.read.assigned",
    "tasks.update.assigned",
    "tasks.delete.assigned",

    // Note management (assigned only)
    "notes.create",
    "notes.read.assigned",
    "notes.update.assigned",
    "notes.delete.assigned",

    // Basic reporting
    "reports.view.personal",
    "data.export.assigned",

    // Daily Activity Reports (self only)
    "reports.daily.create",
    "reports.daily.read.assigned",

    // Personal dashboard
    "dashboard.view.personal",
  ],
};

/**
 * Permission categories for organization
 */
export const PERMISSION_CATEGORIES = {
  users: "User Management",
  leads: "Lead Management",
  meetings: "Meeting Management",
  tasks: "Task Management",
  notes: "Note Management",
  team: "Team Management",
  data: "Data & Export",
  reports: "Reports & Analytics",
  settings: "System Settings",
  dashboard: "Dashboard Access",
  audit: "Audit & Security",
  permissions: "Permission Management",
} as const;

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: string): PermissionKey[] {
  return Object.keys(PERMISSIONS).filter((permission) =>
    permission.startsWith(category + ".")
  ) as PermissionKey[];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): PermissionKey[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a permission exists
 */
export function isValidPermission(
  permission: string
): permission is PermissionKey {
  return permission in PERMISSIONS;
}
