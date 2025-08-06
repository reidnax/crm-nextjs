import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports virtual users)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check permissions for different data types
    const hasReadAllLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.all"
    );
    const hasReadAssignedLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.assigned"
    );
    const hasReadDepartmentLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.department"
    );

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

    const hasReadAllNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.all"
    );
    const hasReadAssignedNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.assigned"
    );
    const hasReadDepartmentNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.department"
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

    // Build permission-based filters for each model type
    const leadsFilter = await buildLeadsFilter(
      userId,
      hasReadAllLeads,
      hasReadAssignedLeads,
      hasReadDepartmentLeads
    );
    const meetingsFilter = await buildMeetingsFilter(
      userId,
      hasReadAllMeetings,
      hasReadAssignedMeetings,
      hasReadDepartmentMeetings
    );
    const tasksFilter = await buildTasksFilter(
      userId,
      hasReadAllTasks,
      hasReadAssignedTasks,
      hasReadDepartmentTasks
    );
    const notesFilter = await buildNotesFilter(
      userId,
      hasReadAllNotes,
      hasReadAssignedNotes,
      hasReadDepartmentNotes
    );

    // Calculate date ranges for additional metrics
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch all statistics in parallel with permission-based filtering
    const [
      totalLeads,
      leadsLastMonth,
      meetingsToday,
      upcomingMeetingsCount,
      pendingTasks,
      overdueTasks,
      totalNotes,
      notesThisWeek,
      recentLeads,
      upcomingMeetings,
      dueTasks,
    ] = await Promise.all([
      // Total leads count (filtered by permissions)
      leadsFilter ? prisma.lead.count({ where: leadsFilter }) : 0,

      // Leads from last month for comparison
      leadsFilter
        ? prisma.lead.count({
            where: {
              ...leadsFilter,
              createdAt: { gte: lastMonth },
            },
          })
        : 0,

      // Meetings scheduled for today (filtered by permissions)
      meetingsFilter
        ? prisma.meeting.count({
            where: {
              ...meetingsFilter,
              startTime: {
                gte: startOfDay,
                lt: endOfDay,
              },
            },
          })
        : 0,

      // Upcoming meetings count (tomorrow onwards)
      meetingsFilter
        ? prisma.meeting.count({
            where: {
              ...meetingsFilter,
              startTime: {
                gte: tomorrow,
              },
            },
          })
        : 0,

      // Pending tasks (due today or overdue, filtered by permissions)
      tasksFilter
        ? prisma.task.count({
            where: {
              ...tasksFilter,
              dueDate: {
                lte: endOfDay,
              },
              status: { not: "Completed" },
            },
          })
        : 0,

      // Overdue tasks (past due and not completed)
      tasksFilter
        ? prisma.task.count({
            where: {
              ...tasksFilter,
              dueDate: {
                lt: startOfDay,
              },
              status: { not: "Completed" },
            },
          })
        : 0,

      // Total notes count (filtered by permissions)
      notesFilter ? prisma.note.count({ where: notesFilter }) : 0,

      // Notes created this week
      notesFilter
        ? prisma.note.count({
            where: {
              ...notesFilter,
              createdAt: { gte: thisWeek },
            },
          })
        : 0,

      // Recent leads (last 5, filtered by permissions)
      leadsFilter
        ? prisma.lead.findMany({
            take: 5,
            where: leadsFilter,
            orderBy: { createdAt: "desc" },
            include: {
              creator: {
                select: { id: true, name: true, username: true },
              },
            },
          })
        : [],

      // Upcoming meetings (next 5, filtered by permissions)
      meetingsFilter
        ? prisma.meeting.findMany({
            take: 5,
            where: {
              ...meetingsFilter,
              startTime: {
                gte: new Date(),
              },
            },
            orderBy: { startTime: "asc" },
            include: {
              lead: {
                select: { id: true, name: true, company: true },
              },
              creator: {
                select: { id: true, name: true, username: true },
              },
            },
          })
        : [],

      // Due tasks (next 5, filtered by permissions)
      tasksFilter
        ? prisma.task.findMany({
            take: 5,
            where: {
              ...tasksFilter,
              dueDate: {
                gte: new Date(),
              },
            },
            orderBy: { dueDate: "asc" },
            include: {
              lead: {
                select: { id: true, name: true, company: true },
              },
              creator: {
                select: { id: true, name: true, username: true },
              },
            },
          })
        : [],
    ]);

    // Calculate dynamic metrics
    const leadsGrowthPercent =
      totalLeads > 0 ? Math.round((leadsLastMonth / totalLeads) * 100) : 0;

    const dashboardData = {
      stats: {
        totalLeads,
        leadsGrowthPercent,
        meetingsToday,
        upcomingMeetingsCount,
        pendingTasks,
        overdueTasks,
        totalNotes,
        notesThisWeek,
      },
      recentLeads,
      upcomingMeetings,
      dueTasks,
    };

    return successResponse(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return errorResponse("Failed to fetch dashboard data");
  }
}

// Helper functions to build model-specific permission filters

// Leads use 'assign' field for assignment
async function buildLeadsFilter(
  userId: number,
  hasReadAll: boolean,
  hasReadAssigned: boolean,
  hasReadDepartment: boolean
): Promise<Record<string, unknown> | null> {
  if (hasReadAll) {
    return {}; // No filter, user can see all
  }

  const permissionFilters = [];

  if (hasReadAssigned) {
    permissionFilters.push({ assign: userId }, { createdBy: userId });
  }

  if (hasReadDepartment) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      // Managers can see department leads
      permissionFilters.push({
        OR: [{ assign: { not: null } }, { createdBy: { not: null } }],
      });
    }
  }

  if (permissionFilters.length > 0) {
    return { OR: permissionFilters };
  }

  return null; // No permissions
}

// Meetings only have 'createdBy' - no assignment field
async function buildMeetingsFilter(
  userId: number,
  hasReadAll: boolean,
  hasReadAssigned: boolean,
  hasReadDepartment: boolean
): Promise<Record<string, unknown> | null> {
  if (hasReadAll) {
    return {}; // No filter, user can see all
  }

  const permissionFilters = [];

  if (hasReadAssigned) {
    // Meetings only have createdBy, no assignment
    permissionFilters.push({ createdBy: userId });
  }

  if (hasReadDepartment) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      // Managers can see department meetings
      permissionFilters.push({ createdBy: { not: null } });
    }
  }

  if (permissionFilters.length > 0) {
    return { OR: permissionFilters };
  }

  return null; // No permissions
}

// Tasks use 'assignedTo' field for assignment
async function buildTasksFilter(
  userId: number,
  hasReadAll: boolean,
  hasReadAssigned: boolean,
  hasReadDepartment: boolean
): Promise<Record<string, unknown> | null> {
  if (hasReadAll) {
    return {}; // No filter, user can see all
  }

  const permissionFilters = [];

  if (hasReadAssigned) {
    permissionFilters.push({ assignedTo: userId }, { createdBy: userId });
  }

  if (hasReadDepartment) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      // Managers can see department tasks
      permissionFilters.push({
        OR: [{ assignedTo: { not: null } }, { createdBy: { not: null } }],
      });
    }
  }

  if (permissionFilters.length > 0) {
    return { OR: permissionFilters };
  }

  return null; // No permissions
}

// Notes only have 'createdBy' - no assignment field
async function buildNotesFilter(
  userId: number,
  hasReadAll: boolean,
  hasReadAssigned: boolean,
  hasReadDepartment: boolean
): Promise<Record<string, unknown> | null> {
  if (hasReadAll) {
    return {}; // No filter, user can see all
  }

  const permissionFilters = [];

  if (hasReadAssigned) {
    // Notes only have createdBy, no assignment
    permissionFilters.push({ createdBy: userId });
  }

  if (hasReadDepartment) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      // Managers can see department notes
      permissionFilters.push({ createdBy: { not: null } });
    }
  }

  if (permissionFilters.length > 0) {
    return { OR: permissionFilters };
  }

  return null; // No permissions
}
