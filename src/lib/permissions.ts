/**
 * Legacy utility functions for backward compatibility
 * For new code, use the enhanced RBAC system in /permissions/
 */

import { RoleHierarchy } from "./permissions/core";

/**
 * Check if a user role has admin permissions
 * @param role - The user role to check
 * @returns true if the role has admin permissions
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "admin-dev";
}

/**
 * Check if a user has admin permissions
 * @param user - User object with role property
 * @returns true if the user has admin permissions
 */
export function isAdmin(user?: { role?: string | null } | null): boolean {
  return isAdminRole(user?.role);
}

/**
 * Get admin roles for filtering/counting (case-insensitive)
 * @returns Array of admin role values for comparison
 */
export function getAdminRoles(): string[] {
  return ["admin", "admin-dev", "Admin", "Admin-Dev"];
}

/**
 * Check if a role matches any of the admin role variations
 * @param role - The role to check
 * @returns true if the role is any variation of admin roles
 */
export function isAdminRoleVariation(role?: string | null): boolean {
  if (!role) return false;
  const adminVariations = ["admin", "admin-dev", "Admin", "Admin-Dev"];
  return adminVariations.includes(role);
}

/**
 * Check if user can assign a role (enhanced with hierarchy)
 * @param assignerRole - Role of the user assigning
 * @param targetRole - Role being assigned
 * @returns true if assignment is allowed
 */
export function canAssignRole(
  assignerRole?: string | null,
  targetRole?: string | null
): boolean {
  if (!assignerRole || !targetRole) return false;
  return RoleHierarchy.canAssignRole(assignerRole, targetRole);
}

/**
 * Check if user can manage another user
 * @param managerRole - Role of the manager
 * @param targetRole - Role of the target user
 * @returns true if management is allowed
 */
export function canManageUser(
  managerRole?: string | null,
  targetRole?: string | null
): boolean {
  if (!managerRole || !targetRole) return false;
  return RoleHierarchy.canManageUser(managerRole, targetRole);
}

/**
 * Get role hierarchy level (higher number = more permissions)
 * @param role - Role to check
 * @returns Numeric level of the role
 */
export function getRoleLevel(role?: string | null): number {
  if (!role) return 0;
  return RoleHierarchy.getRoleLevel(role);
}
