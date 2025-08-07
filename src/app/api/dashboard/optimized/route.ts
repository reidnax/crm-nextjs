import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { DatabaseOptimizer, PerformanceMonitor } from "@/lib/performance-utils";

// GET /api/dashboard/optimized - Optimized dashboard with batched queries
export async function GET() {
  try {
    PerformanceMonitor.start("dashboard-total");

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports virtual users)
    const { userId } = await PerformanceMonitor.measureAsync(
      "get-effective-user",
      async () => {
        return await getEffectiveUserForPermissions(session);
      }
    );

    // Batch all permission checks at once
    const allPermissions = [
      "leads.read.all",
      "leads.read.assigned",
      "leads.read.department",
      "meetings.read.all",
      "meetings.read.assigned",
      "meetings.read.department",
      "tasks.read.all",
      "tasks.read.assigned",
      "tasks.read.department",
      "notes.read.all",
      "notes.read.assigned",
      "notes.read.department",
    ];

    const permissions = await PerformanceMonitor.measureAsync(
      "batch-permissions",
      async () => {
        return await DatabaseOptimizer.batchPermissionChecks(
          userId,
          allPermissions
        );
      }
    );

    // Get current date for today's meetings and tasks
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    // Build optimized filters
    const leadsFilter = await buildOptimizedLeadsFilter(userId, permissions);
    const meetingsFilter = await buildOptimizedMeetingsFilter(
      userId,
      permissions
    );
    const tasksFilter = await buildOptimizedTasksFilter(userId, permissions);
    const notesFilter = await buildOptimizedNotesFilter(userId, permissions);

    // Execute all dashboard queries in parallel
    const [
      totalLeads,
      totalMeetings,
      totalTasks,
      totalNotes,
      todaysMeetings,
      todaysTasks,
      leadsByStatus,
      tasksByStatus,
      recentLeads,
      recentMeetings,
      recentTasks,
      recentNotes,
    ] = await PerformanceMonitor.measureAsync("parallel-queries", async () => {
      return await Promise.all([
        // Count queries
        prisma.lead.count({ where: leadsFilter }),
        prisma.meeting.count({ where: meetingsFilter }),
        prisma.task.count({ where: tasksFilter }),
        prisma.note.count({ where: notesFilter }),

        // Today's items
        prisma.meeting.count({
          where: {
            ...meetingsFilter,
            date: { gte: startOfDay, lt: endOfDay },
          },
        }),
        prisma.task.count({
          where: {
            ...tasksFilter,
            dueDate: { gte: startOfDay, lt: endOfDay },
          },
        }),

        // Status breakdowns
        prisma.lead.groupBy({
          by: ["status"],
          where: leadsFilter,
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: tasksFilter,
          _count: { id: true },
        }),

        // Recent items with minimal fields
        prisma.lead.findMany({
          where: leadsFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            status: true,
            createdAt: true,
            assignee: { select: { name: true } },
          },
        }),
        prisma.meeting.findMany({
          where: meetingsFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            date: true,
            createdAt: true,
            lead: { select: { companyName: true } },
          },
        }),
        prisma.task.findMany({
          where: tasksFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            priority: true,
            createdAt: true,
            lead: { select: { companyName: true } },
          },
        }),
        prisma.note.findMany({
          where: notesFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            subject: true,
            content: true,
            createdAt: true,
            lead: { select: { companyName: true } },
          },
        }),
      ]);
    });

    const totalTime = PerformanceMonitor.end("dashboard-total");

    const data = {
      stats: {
        totalLeads,
        totalMeetings,
        totalTasks,
        totalNotes,
        todaysMeetings,
        todaysTasks,
      },
      breakdowns: {
        leadsByStatus: leadsByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
        tasksByStatus: tasksByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recent: {
        leads: recentLeads,
        meetings: recentMeetings,
        tasks: recentTasks,
        notes: recentNotes,
      },
      meta: {
        executionTime: totalTime,
        cacheStatus: "optimized",
      },
    };

    return successResponse(data);
  } catch (error) {
    PerformanceMonitor.end("dashboard-total");
    console.error("Dashboard API error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// Optimized filter builders (simplified versions)
async function buildOptimizedLeadsFilter(
  userId: number,
  permissions: Record<string, boolean>
) {
  const hasViewAllLeads = permissions["leads.read.all"];
  const hasViewAssignedLeads = permissions["leads.read.assigned"];
  const hasViewDepartmentLeads = permissions["leads.read.department"];

  if (hasViewAllLeads) {
    return {}; // No filter needed
  }

  const filters = [];

  if (hasViewAssignedLeads) {
    filters.push({ assign: userId }, { createdBy: userId });
  }

  if (hasViewDepartmentLeads) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true },
    });

    if (user?.department) {
      filters.push({
        OR: [
          { assignee: { department: user.department } },
          { creator: { department: user.department } },
        ],
      });
    }
  }

  return filters.length > 0 ? { OR: filters } : { id: -1 }; // No access
}

async function buildOptimizedMeetingsFilter(
  userId: number,
  permissions: Record<string, boolean>
) {
  const hasViewAllMeetings = permissions["meetings.read.all"];
  const hasViewAssignedMeetings = permissions["meetings.read.assigned"];

  if (hasViewAllMeetings) {
    return {};
  }

  if (hasViewAssignedMeetings) {
    return { createdBy: userId };
  }

  return { id: -1 }; // No access
}

async function buildOptimizedTasksFilter(
  userId: number,
  permissions: Record<string, boolean>
) {
  const hasViewAllTasks = permissions["tasks.read.all"];
  const hasViewAssignedTasks = permissions["tasks.read.assigned"];

  if (hasViewAllTasks) {
    return {};
  }

  if (hasViewAssignedTasks) {
    return { createdBy: userId };
  }

  return { id: -1 }; // No access
}

async function buildOptimizedNotesFilter(
  userId: number,
  permissions: Record<string, boolean>
) {
  const hasViewAllNotes = permissions["notes.read.all"];
  const hasViewAssignedNotes = permissions["notes.read.assigned"];

  if (hasViewAllNotes) {
    return {};
  }

  if (hasViewAssignedNotes) {
    return { createdBy: userId };
  }

  return { id: -1 }; // No access
}
