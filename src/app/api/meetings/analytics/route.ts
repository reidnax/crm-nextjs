import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check meeting permissions
    const hasReadAllMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.all"
    );
    const hasReadAssignedMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.assigned"
    );
    const hasReadDepartmentMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.department"
    );

    if (
      !hasReadAllMeetings &&
      !hasReadAssignedMeetings &&
      !hasReadDepartmentMeetings
    ) {
      return errorResponse(
        "Forbidden: You don't have permission to read meeting analytics",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    // Base where clause
    const baseWhere: any = {};

    // CRITICAL: Exclude deleted items from analytics
    baseWhere.deletedAt = null;

    if (leadId) {
      baseWhere.leadId = parseInt(leadId);
    }

    // Apply permission-based filtering
    if (!hasReadAllMeetings) {
      const permissionFilters = [];

      if (hasReadAssignedMeetings) {
        // Can read meetings created by them
        permissionFilters.push({ createdBy: userId });
      }

      if (hasReadDepartmentMeetings) {
        // Get user's team/department members
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            department: true,
            managerId: true,
          },
        });

        if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
          // Managers can read all meetings for leads they can access
          const userManagedLeads = await prisma.lead.findMany({
            where: {
              OR: [{ assign: userId }, { createdBy: userId }],
            },
            select: { id: true },
          });

          const managedLeadIds = userManagedLeads.map((lead) => lead.id);
          if (managedLeadIds.length > 0) {
            permissionFilters.push({ leadId: { in: managedLeadIds } });
          }
        }
      }

      if (permissionFilters.length > 0) {
        baseWhere.OR = permissionFilters;
      } else {
        // If no permission filters apply, user can only see their own meetings
        baseWhere.createdBy = userId;
      }
    }

    // Get current date for overdue calculation
    const now = new Date();

    // Simple parallel queries for status counts
    const [
      totalMeetings,
      scheduledMeetings,
      completedMeetings,
      cancelledMeetings,
      inProgressMeetings,
      overdueMeetings,
    ] = await Promise.all([
      // Total meetings
      prisma.meeting.count({ where: baseWhere }),

      // Scheduled meetings
      prisma.meeting.count({
        where: { ...baseWhere, status: "Scheduled" },
      }),

      // Completed meetings
      prisma.meeting.count({
        where: { ...baseWhere, status: "Completed" },
      }),

      // Cancelled meetings
      prisma.meeting.count({
        where: { ...baseWhere, status: "Cancelled" },
      }),

      // In Progress meetings
      prisma.meeting.count({
        where: { ...baseWhere, status: "In Progress" },
      }),

      // Overdue meetings (scheduled but past start time)
      prisma.meeting.count({
        where: {
          ...baseWhere,
          status: "Scheduled",
          startTime: {
            lt: now,
          },
        },
      }),
    ]);

    // Calculate completion rate
    const completionRate =
      totalMeetings > 0
        ? Math.round((completedMeetings / totalMeetings) * 100)
        : 0;

    // Calculate average duration from completed meetings with duration
    let averageDuration = 0;
    try {
      const completedWithDuration = await prisma.meeting.findMany({
        where: {
          ...baseWhere,
          status: "Completed",
          duration: {
            gt: 0, // Greater than 0 instead of not null
          },
        },
        select: {
          duration: true,
        },
        take: 50, // Smaller sample for performance
        orderBy: {
          createdAt: "desc",
        },
      });

      if (completedWithDuration.length > 0) {
        const totalDuration = completedWithDuration.reduce(
          (sum, meeting) => sum + (meeting.duration || 0),
          0
        );
        averageDuration = Math.round(
          totalDuration / completedWithDuration.length
        );
      }
    } catch (error) {
      console.warn("Error calculating average duration:", error);
      // Continue without average duration
    }

    // Get type breakdown
    let typeBreakdown: Record<string, number> = {};
    try {
      const typeStats = await prisma.meeting.groupBy({
        by: ["type"],
        where: baseWhere,
        _count: {
          id: true,
        },
      });

      typeBreakdown = typeStats.reduce((acc, item) => {
        acc[item.type || "Meeting"] = item._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.warn("Error fetching type breakdown:", error);
    }

    // Get priority breakdown
    let priorityBreakdown: Record<string, number> = {};
    try {
      const priorityStats = await prisma.meeting.groupBy({
        by: ["priority"],
        where: baseWhere,
        _count: {
          id: true,
        },
      });

      priorityBreakdown = priorityStats.reduce((acc, item) => {
        acc[item.priority || "Medium"] = item._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.warn("Error fetching priority breakdown:", error);
    }

    // Simple analytics response matching the expected interface
    const analytics = {
      total: totalMeetings,
      scheduled: scheduledMeetings,
      completed: completedMeetings,
      inProgress: inProgressMeetings,
      cancelled: cancelledMeetings,
      overdue: overdueMeetings,

      // Additional metrics for detailed analytics
      overview: {
        total: totalMeetings,
        scheduled: scheduledMeetings,
        completed: completedMeetings,
        cancelled: cancelledMeetings,
        inProgress: inProgressMeetings,
        overdue: overdueMeetings,
        completionRate,
        averageDuration,
      },
      breakdown: {
        byType: typeBreakdown,
        byPriority: priorityBreakdown,
      },
    };

    return successResponse(analytics);
  } catch (error) {
    console.error("Error fetching meeting analytics:", error);
    return errorResponse("Failed to fetch meeting analytics", 500);
  }
}
