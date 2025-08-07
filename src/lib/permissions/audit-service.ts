/**
 * Audit Service - Permission and system change logging
 */

import { prisma } from "@/lib/prisma";

export interface AuditLogParams {
  userId: number;
  action:
    | "granted"
    | "revoked"
    | "role_changed"
    | "login"
    | "logout"
    | "resource_access"
    | "resource_created"
    | "resource_updated"
    | "resource_deleted";
  permission?: string;
  oldValue?: any;
  newValue?: any;
  changedBy?: number;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: number;
  success?: boolean;
  errorMessage?: string;
}

export interface ResourceAccessParams {
  userId: number;
  resourceType: string;
  resourceId: number;
  action: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

/**
 * Audit Service for logging system events and permission changes
 */
export class AuditService {
  /**
   * Log permission changes (grant, revoke, role change)
   */
  static async logPermissionChange(params: AuditLogParams): Promise<void> {
    try {
      await prisma.permissionAuditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          permission: params.permission || null,
          oldValue: params.oldValue
            ? JSON.stringify(params.oldValue)
            : undefined,
          newValue: params.newValue
            ? JSON.stringify(params.newValue)
            : undefined,
          changedBy: params.changedBy || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error("Failed to log permission change:", error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log resource access attempts
   */
  static async logResourceAccess(params: ResourceAccessParams): Promise<void> {
    try {
      await prisma.permissionAuditLog.create({
        data: {
          userId: params.userId,
          action: "resource_access",
          permission: null,
          oldValue: undefined,
          newValue: JSON.stringify({
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            action: params.action,
            success: params.success,
            errorMessage: params.errorMessage,
          }),
          changedBy: null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error("Failed to log resource access:", error);
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuthEvent(
    userId: number,
    action: "login" | "logout" | "login_failed",
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.permissionAuditLog.create({
        data: {
          userId,
          action,
          permission: null,
          oldValue: undefined,
          newValue: JSON.stringify({
            success: action !== "login_failed",
            errorMessage: errorMessage || null,
          }),
          changedBy: null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (error) {
      console.error("Failed to log auth event:", error);
    }
  }

  /**
   * Log role changes
   */
  static async logRoleChange(
    userId: number,
    oldRole: string | null,
    newRole: string | null,
    changedBy: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.logPermissionChange({
        userId,
        action: "role_changed",
        oldValue: { role: oldRole },
        newValue: { role: newRole },
        changedBy,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error("Failed to log role change:", error);
    }
  }

  /**
   * Log resource creation/update/deletion
   */
  static async logResourceChange(
    userId: number,
    action: "resource_created" | "resource_updated" | "resource_deleted",
    resourceType: string,
    resourceId: number,
    changes?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.permissionAuditLog.create({
        data: {
          userId,
          action,
          permission: null,
          oldValue: changes?.oldValue
            ? JSON.stringify(changes.oldValue)
            : undefined,
          newValue: JSON.stringify({
            resourceType,
            resourceId,
            changes: changes?.newValue || null,
          }),
          changedBy: null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (error) {
      console.error("Failed to log resource change:", error);
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      return await prisma.permissionAuditLog.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          changedByUser: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error("Failed to get user audit logs:", error);
      return [];
    }
  }

  /**
   * Get audit logs for all users (admin view)
   */
  static async getAllAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      action?: string;
      userId?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    try {
      const where: any = {};

      if (filters?.action) {
        where.action = filters.action;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      return await prisma.permissionAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          changedByUser: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error("Failed to get audit logs:", error);
      return [];
    }
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      const stats = await prisma.permissionAuditLog.groupBy({
        by: ["action"],
        where,
        _count: {
          action: true,
        },
      });

      return stats.reduce((acc, stat) => {
        acc[stat.action] = stat._count.action;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error("Failed to get audit stats:", error);
      return {};
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.permissionAuditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error("Failed to cleanup old audit logs:", error);
      return 0;
    }
  }
}
