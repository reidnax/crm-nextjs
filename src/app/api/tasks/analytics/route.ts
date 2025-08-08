import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// GET /api/tasks/analytics - Get task analytics/statistics
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);
    // userId available if needed

    // Check task permissions
    const hasReadAllTasks = await PermissionManager.hasPermission(
      userId,
      "tasks.read.all"
    );
    const hasReadAssignedTasks = await PermissionManager.hasPermission(
      userId,
      "tasks.read.assigned"
    );
    const hasReadDepartmentTasks = await PermissionManager.hasPermission(
      userId,
      "tasks.read.department"
    );

    if (!hasReadAllTasks && !hasReadAssignedTasks && !hasReadDepartmentTasks) {
      return errorResponse(
        "Forbidden: You don't have permission to read tasks",
        403
      );
    }

    const where: Record<string, unknown> = {};

    // CRITICAL: Exclude deleted items from analytics
    where.deletedAt = null;

    // Apply permission-based filtering (same logic as main tasks API)
    if (!hasReadAllTasks) {
      const permissionFilters = [];

      if (hasReadAssignedTasks) {
        // Can read tasks created by them or assigned to them
        permissionFilters.push({ createdBy: userId }, { assignedTo: userId });
      }

      if (hasReadDepartmentTasks) {
        // Get user role once and cache it (avoid N+1 query)
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
          // Managers can read all tasks (this would need more sophisticated lead access checking)
          permissionFilters.push({});
        }
      }

      if (permissionFilters.length > 0) {
        where.OR = permissionFilters;
      } else {
        // No permission to read any tasks
        return successResponse({
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
        });
      }
    }

    // Get current date for overdue calculation
    const now = new Date();

    // Single optimized aggregation query instead of multiple COUNT queries
    // where clause built

    // Force a fresh connection/transaction to ensure we see latest committed data
    const aggregation = await prisma.$transaction(async (tx) => {
      return await tx.task.groupBy({
        by: ["status"],
        where,
        _count: {
          id: true,
        },
      });
    });

    // aggregation computed

    // Additional query for overdue tasks (different where condition)
    const overdueWhere = {
      ...where,
      AND: [
        {
          status: {
            not: "Completed",
          },
        },
        {
          dueDate: {
            lt: now,
          },
        },
      ],
    };

    // overdue where built

    const overdueCount = await prisma.$transaction(async (tx) => {
      return await tx.task.count({
        where: overdueWhere,
      });
    });

    // overdue computed

    // Process aggregation results
    const statusCounts = aggregation.reduce((acc, item) => {
      acc[item.status || "null"] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const analytics = {
      total: aggregation.reduce((sum, item) => sum + item._count.id, 0),
      pending: statusCounts["Pending"] || 0,
      inProgress: statusCounts["In Progress"] || 0,
      completed: statusCounts["Completed"] || 0,
      overdue: overdueCount,
    };

    // response ready

    return successResponse(analytics);
  } catch (error) {
    console.error(`Error fetching task analytics:`, error);
    return errorResponse("Failed to fetch task analytics", 500);
  }
}
