/**
 * Core Permission Management System
 * Handles permission checking, granting, and resource ownership
 */

import { prisma } from "@/lib/prisma";
import {
  PermissionKey,
  getRolePermissions,
  isValidPermission,
} from "./permission-matrix";
import { AuditService } from "./audit-service";

export interface UserWithPermissions {
  id: number;
  role?: string | null;
  department?: string | null;
  managerId?: number | null;
}

export interface PermissionContext {
  userId: number;
  resourceType?: string;
  resourceId?: number;
  targetUserId?: number; // For user-related operations
}

/**
 * Permission Manager - Core permission checking logic
 */
export class PermissionManager {
  /**
   * Check if user has a specific permission
   */
  static async hasPermission(
    userId: number,
    permission: PermissionKey,
    context?: PermissionContext
  ): Promise<boolean> {
    try {
      // Get user with role and relationships
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId.toString()) },
        include: {
          userPermissions: {
            include: {
              permission: true,
            },
          },
          manager: true,
          subordinates: true,
        },
      });

      if (!user || !user.active) {
        return false;
      }

      // Check explicit user permissions first (overrides role permissions)
      const userPermission = user.userPermissions.find(
        (up) => up.permission.name === permission
      );

      if (userPermission) {
        return userPermission.granted;
      }

      // Check role-based permissions
      const rolePermissions = getRolePermissions(user.role || "");
      if (!rolePermissions.includes(permission)) {
        return false;
      }

      // Apply context-specific checks
      if (context) {
        return await this.checkContextualPermission(user, permission, context);
      }

      return true;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  /**
   * Check multiple permissions at once
   */
  static async hasPermissions(
    userId: number,
    permissions: PermissionKey[],
    requireAll: boolean = true,
    context?: PermissionContext
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map((permission) =>
        this.hasPermission(userId, permission, context)
      )
    );

    return requireAll ? results.every(Boolean) : results.some(Boolean);
  }

  /**
   * Get all permissions for a user (role + explicit permissions)
   */
  static async getUserPermissions(userId: number): Promise<PermissionKey[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userPermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        return [];
      }

      // Start with role permissions
      const rolePermissions = getRolePermissions(user.role || "");
      const permissions = new Set(rolePermissions);

      // Apply explicit user permissions (grants and denials)
      user.userPermissions.forEach((up) => {
        const permissionName = up.permission.name as PermissionKey;
        if (up.granted) {
          permissions.add(permissionName);
        } else {
          permissions.delete(permissionName);
        }
      });

      return Array.from(permissions);
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return [];
    }
  }

  /**
   * Check resource ownership
   */
  static async isOwner(
    userId: number,
    resourceType: string,
    resourceId: number
  ): Promise<boolean> {
    try {
      // Check explicit ownership
      const ownership = await prisma.resourceOwnership.findUnique({
        where: {
          resourceType_resourceId: {
            resourceType,
            resourceId,
          },
        },
      });

      if (ownership) {
        return ownership.ownerId === userId;
      }

      // Check implicit ownership based on resource type
      return await this.checkImplicitOwnership(
        userId,
        resourceType,
        resourceId
      );
    } catch (error) {
      console.error("Error checking ownership:", error);
      return false;
    }
  }

  /**
   * Grant permission to user
   */
  static async grantPermission(
    userId: number,
    permission: PermissionKey,
    grantedBy: number,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      if (!isValidPermission(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }

      // Get or create permission record
      const permissionRecord = await prisma.permission.upsert({
        where: { name: permission },
        update: {},
        create: {
          name: permission,
          description: `Permission: ${permission}`,
          category: permission.split(".")[0],
        },
      });

      // Upsert user permission
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permissionRecord.id,
          },
        },
        update: {
          granted: true,
          grantedBy,
          updatedAt: new Date(),
        },
        create: {
          userId,
          permissionId: permissionRecord.id,
          granted: true,
          grantedBy,
        },
      });

      // Log the change
      await AuditService.logPermissionChange({
        userId,
        action: "granted",
        permission,
        newValue: { granted: true },
        changedBy: grantedBy,
        ipAddress,
      });

      return true;
    } catch (error) {
      console.error("Error granting permission:", error);
      return false;
    }
  }

  /**
   * Revoke permission from user
   */
  static async revokePermission(
    userId: number,
    permission: PermissionKey,
    revokedBy: number,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      const permissionRecord = await prisma.permission.findUnique({
        where: { name: permission },
      });

      if (!permissionRecord) {
        return true; // Permission doesn't exist, consider it revoked
      }

      // Update user permission to denied
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permissionRecord.id,
          },
        },
        update: {
          granted: false,
          grantedBy: revokedBy,
          updatedAt: new Date(),
        },
        create: {
          userId,
          permissionId: permissionRecord.id,
          granted: false,
          grantedBy: revokedBy,
        },
      });

      // Log the change
      await AuditService.logPermissionChange({
        userId,
        action: "revoked",
        permission,
        newValue: { granted: false },
        changedBy: revokedBy,
        ipAddress,
      });

      return true;
    } catch (error) {
      console.error("Error revoking permission:", error);
      return false;
    }
  }

  /**
   * Check contextual permissions (department, ownership, etc.)
   */
  private static async checkContextualPermission(
    user: UserWithPermissions,
    permission: PermissionKey,
    context: PermissionContext
  ): Promise<boolean> {
    // Department-based permissions
    if (permission.includes(".department")) {
      return await this.checkDepartmentPermission(user, context);
    }

    // Assigned/ownership-based permissions
    if (permission.includes(".assigned")) {
      return await this.checkAssignedPermission(user, context);
    }

    // Team-based permissions (manager can access subordinates)
    if (permission.includes(".team")) {
      return await this.checkTeamPermission(user, context);
    }

    return true;
  }

  /**
   * Check department-based permissions
   */
  private static async checkDepartmentPermission(
    user: UserWithPermissions,
    context: PermissionContext
  ): Promise<boolean> {
    if (!user.department || !context.targetUserId) {
      return false;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: context.targetUserId },
      select: { department: true },
    });

    return targetUser?.department === user.department;
  }

  /**
   * Check assigned/ownership-based permissions
   */
  private static async checkAssignedPermission(
    user: UserWithPermissions,
    context: PermissionContext
  ): Promise<boolean> {
    if (!context.resourceType || !context.resourceId) {
      return false;
    }

    return await this.isOwner(
      user.id,
      context.resourceType,
      context.resourceId
    );
  }

  /**
   * Check team-based permissions (manager accessing subordinate resources)
   */
  private static async checkTeamPermission(
    user: UserWithPermissions,
    context: PermissionContext
  ): Promise<boolean> {
    if (!context.targetUserId) {
      return false;
    }

    // Check if target user is a subordinate
    const targetUser = await prisma.user.findUnique({
      where: { id: context.targetUserId },
      select: { managerId: true },
    });

    return targetUser?.managerId === user.id;
  }

  /**
   * Check implicit ownership (based on resource creator/assignee)
   */
  private static async checkImplicitOwnership(
    userId: number,
    resourceType: string,
    resourceId: number
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case "lead":
          const lead = await prisma.lead.findUnique({
            where: { id: resourceId },
            select: { createdBy: true, assign: true },
          });
          return lead?.createdBy === userId || lead?.assign === userId;

        case "meeting":
          const meeting = await prisma.meeting.findUnique({
            where: { id: resourceId },
            select: { createdBy: true },
          });
          return meeting?.createdBy === userId;

        case "task":
          const task = await prisma.task.findUnique({
            where: { id: resourceId },
            select: { createdBy: true, assignedTo: true },
          });
          return task?.createdBy === userId || task?.assignedTo === userId;

        case "note":
          const note = await prisma.note.findUnique({
            where: { id: resourceId },
            select: { createdBy: true },
          });
          return note?.createdBy === userId;

        default:
          return false;
      }
    } catch (error) {
      console.error("Error checking implicit ownership:", error);
      return false;
    }
  }
}

/**
 * Role Hierarchy Management
 */
export class RoleHierarchy {
  private static hierarchy: Record<string, number> = {
    Admin: 100,
    "Admin-Dev": 100,
    Manager: 50,
    Assignee: 10,
  };

  /**
   * Check if assigner can assign target role
   */
  static canAssignRole(assignerRole: string, targetRole: string): boolean {
    const assignerLevel = this.getRoleLevel(assignerRole);
    const targetLevel = this.getRoleLevel(targetRole);

    // Assigners can only assign roles at their level or below
    // Exception: Same level roles can be assigned by admins
    if (assignerLevel >= 100) {
      return true; // Admins can assign any role
    }

    return assignerLevel > targetLevel;
  }

  /**
   * Get role hierarchy level
   */
  static getRoleLevel(role: string): number {
    return this.hierarchy[role] || 0;
  }

  /**
   * Get roles that can be assigned by user
   */
  static getAssignableRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);

    return Object.entries(this.hierarchy)
      .filter(([role, level]) => {
        if (userLevel >= 100) return true; // Admins can assign any role
        return level < userLevel;
      })
      .map(([role]) => role);
  }

  /**
   * Check if user can manage another user
   */
  static canManageUser(managerRole: string, targetRole: string): boolean {
    const managerLevel = this.getRoleLevel(managerRole);
    const targetLevel = this.getRoleLevel(targetRole);

    // Can manage users with lower hierarchy level
    return managerLevel > targetLevel;
  }
}
