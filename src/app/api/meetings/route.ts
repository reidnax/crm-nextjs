import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

// GET /api/meetings - Get all meetings with permission filtering
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API: GET /api/meetings called");

    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("🔍 API: No session found");
      return errorResponse("Unauthorized", 401);
    }

    console.log("🔍 API: Session found for user:", session.user?.email);

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);
    console.log("🔍 API: Effective user ID:", userId);

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

    console.log("🔍 API: Permission check results:", {
      hasReadAllMeetings,
      hasReadAssignedMeetings,
      hasReadDepartmentMeetings,
    });

    if (
      !hasReadAllMeetings &&
      !hasReadAssignedMeetings &&
      !hasReadDepartmentMeetings
    ) {
      console.log("🔍 API: User permissions check failed:", {
        userId,
        hasReadAllMeetings,
        hasReadAssignedMeetings,
        hasReadDepartmentMeetings,
      });
      return errorResponse(
        "Forbidden: You don't have permission to read meetings",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50); // Max 50 items per page

    console.log("🔍 API: Request parameters:", {
      leadId,
      cursor,
      limit,
      searchParams: Object.fromEntries(searchParams.entries()),
    });

    // Server-side filtering parameters
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("type");
    const priorityFilter = searchParams.get("priority");
    const dateRange = searchParams.get("dateRange");
    const searchQuery = searchParams.get("search");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Server-side sorting parameters
    const sortField = searchParams.get("sortField") || "startTime";
    const sortDirection = searchParams.get("sortDirection") || "asc";

    // Check if user can view deleted items (admin/admin-dev only)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const canViewDeleted =
      user?.role && ["Admin", "Admin-Dev"].includes(user.role);

    const where: Record<string, unknown> = {};

    // By default, exclude deleted items unless explicitly requested by admins
    if (!includeDeleted || !canViewDeleted) {
      where.deletedAt = null;
    }
    if (leadId) {
      where.leadId = parseInt(leadId);
    }

    // Apply server-side filters
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    if (typeFilter && typeFilter !== "all") {
      where.type = typeFilter;
    }

    if (priorityFilter && priorityFilter !== "all") {
      where.priority = priorityFilter;
    }

    // Date range filtering
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "tomorrow":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            23,
            59,
            59,
            999
          );
          break;
        case "this_week":
          const dayOfWeek = now.getDay();
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - dayOfWeek
          );
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (6 - dayOfWeek),
            23,
            59,
            59,
            999
          );
          break;
        case "next_week":
          const nextWeekStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (7 - now.getDay())
          );
          startDate = nextWeekStart;
          endDate = new Date(
            nextWeekStart.getFullYear(),
            nextWeekStart.getMonth(),
            nextWeekStart.getDate() + 6,
            23,
            59,
            59,
            999
          );
          break;
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          break;
        default:
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
      }

      where.startTime = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Search across meeting subject, description, lead name, and creator name
    if (searchQuery && searchQuery.trim()) {
      where.OR = [
        ...(where.OR ? (Array.isArray(where.OR) ? where.OR : [where.OR]) : []),
        {
          subject: {
            contains: searchQuery.trim(),
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchQuery.trim(),
            mode: "insensitive",
          },
        },
        {
          lead: {
            name: {
              contains: searchQuery.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          creator: {
            name: {
              contains: searchQuery.trim(),
              mode: "insensitive",
            },
          },
        },
      ];
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
        where.AND = [
          ...(where.AND
            ? Array.isArray(where.AND)
              ? where.AND
              : [where.AND]
            : []),
          { OR: permissionFilters },
        ];
      } else {
        // If no permission filters apply, user can only see their own meetings
        where.createdBy = userId;
      }
    }

    // Pagination with cursor
    if (cursor) {
      where.id = {
        lt: parseInt(cursor),
      };
    }

    // Build dynamic orderBy based on sort parameters
    const buildOrderBy = () => {
      const orderBy: Array<Prisma.MeetingOrderByWithRelationInput> = [];

      // Primary sort field
      if (sortField === "startTime") {
        orderBy.push({ startTime: sortDirection as "asc" | "desc" });
      } else if (sortField === "priority") {
        // We'll handle priority sorting with separate queries below
        // This ensures proper database-level sorting and pagination
      } else if (sortField === "status") {
        orderBy.push({ status: sortDirection as "asc" | "desc" });
      } else if (sortField === "subject") {
        orderBy.push({ subject: sortDirection as "asc" | "desc" });
      } else if (sortField === "type") {
        orderBy.push({ type: sortDirection as "asc" | "desc" });
      } else if (sortField === "createdAt") {
        orderBy.push({ createdAt: sortDirection as "asc" | "desc" });
      } else if (sortField === "leadName") {
        orderBy.push({ lead: { name: sortDirection as "asc" | "desc" } });
      }

      // Secondary sort: always by startTime for consistency (unless it's primary)
      if (sortField !== "startTime") {
        orderBy.push({ startTime: "asc" });
      }

      // Stable sort for pagination
      orderBy.push({ id: "asc" });

      return orderBy;
    };

    // Build pagination options
    const findManyOptions: {
      where: Record<string, unknown>;
      include: Record<string, unknown>;
      orderBy: Prisma.MeetingOrderByWithRelationInput[];
      take: number;
      cursor?: { id: number };
      skip?: number;
    } = {
      where,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: buildOrderBy(),
      take: limit + 1, // Take one extra to check if there's a next page
    };

    // Add cursor for pagination
    if (cursor) {
      findManyOptions.cursor = { id: parseInt(cursor) };
      findManyOptions.skip = 1; // Skip the cursor item
    }

    let meetings;

    // Execute the query with proper priority handling
    if (sortField === "priority") {
      // Alphabetical order is: ['High', 'Low', 'Medium'] (asc) and ['Medium', 'Low', 'High'] (desc)
      // We want logical priority: ['High', 'Medium', 'Low'] (asc) and ['Low', 'Medium', 'High'] (desc)
      // Since alphabetical doesn't match logical order, we'll use separate queries for each priority level

      const priorityOrder =
        sortDirection === "asc"
          ? ["High", "Medium", "Low"]
          : ["Low", "Medium", "High"];

      const allMeetings: Awaited<ReturnType<typeof prisma.meeting.findMany>> =
        [];
      let remainingLimit = limit + 1;

      // Fetch meetings for each priority level in the desired order
      for (const priority of priorityOrder) {
        if (remainingLimit <= 0) break;

        const priorityWhere = { ...where, priority };
        const priorityMeetings = await prisma.meeting.findMany({
          where: priorityWhere,
          include: findManyOptions.include,
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
          take: remainingLimit,
          ...(cursor &&
            allMeetings.length === 0 && {
              cursor: { id: parseInt(cursor) },
              skip: 1,
            }),
        });

        allMeetings.push(...priorityMeetings);
        remainingLimit -= priorityMeetings.length;
      }

      // Handle null/undefined priority meetings
      if (remainingLimit > 0) {
        const nullMeetings = await prisma.meeting.findMany({
          where: { ...where, priority: null },
          include: findManyOptions.include,
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
          take: remainingLimit,
        });
        allMeetings.push(...nullMeetings);
      }

      meetings = allMeetings;
    } else {
      // Normal sorting for non-priority fields
      meetings = await prisma.meeting.findMany(findManyOptions);
    }

    console.log(
      "🔍 API: Query executed successfully. Found meetings:",
      meetings.length
    );

    // Check if there's a next page
    const hasNextPage = meetings.length > limit;
    if (hasNextPage) {
      meetings.pop(); // Remove the extra item
    }

    // Get the next cursor
    const nextCursor =
      hasNextPage && meetings.length > 0
        ? meetings[meetings.length - 1].id
        : null;

    const response = {
      meetings,
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
      },
    };

    console.log("🔍 API: Returning response:", {
      meetingsCount: meetings.length,
      hasNextPage,
      nextCursor,
      limit,
    });

    return successResponse(response);
  } catch (error) {
    console.error("🔍 API: Error fetching meetings:", error);
    return errorResponse("Failed to fetch meetings", 500);
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user has permission to create meetings
    const canCreateMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.create"
    );
    if (!canCreateMeetings) {
      return errorResponse(
        "Forbidden: You don't have permission to create meetings",
        403
      );
    }

    const body = await request.json();
    const {
      subject,
      description,
      startTime,
      endTime,
      location,
      type,
      status,
      priority,
      agenda,
      outcome,
      attendees,
      isRecurring,
      leadId,
    } = body;

    // Basic validation
    if (!subject || !startTime || !endTime || !leadId) {
      return errorResponse(
        "Subject, start time, end time, and lead ID are required",
        400
      );
    }

    // Validate that end time is after start time
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return errorResponse("End time must be after start time", 400);
    }

    // Calculate duration in minutes
    const duration = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Check for time conflicts with existing meetings for this lead
    const conflict = await prisma.meeting.findFirst({
      where: {
        leadId,
        deletedAt: null, // CRITICAL: Don't consider deleted meetings for conflicts
        status: { not: "Cancelled" },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } },
          { startTime: { gte: start, lt: end } },
          { endTime: { gt: start, lte: end } },
        ],
      },
      select: {
        id: true,
        subject: true,
        startTime: true,
        endTime: true,
      },
    });

    if (conflict) {
      const conflictStart = format(
        new Date(conflict.startTime),
        "dd/MM/yyyy HH:mm"
      );
      const conflictEnd = format(
        new Date(conflict.endTime),
        "dd/MM/yyyy HH:mm"
      );
      const newStart = format(start, "dd/MM/yyyy HH:mm");
      const newEnd = format(end, "dd/MM/yyyy HH:mm");

      return errorResponse(
        `Time conflict detected! The meeting "${conflict.subject}" is already scheduled from ${conflictStart} to ${conflictEnd}, which overlaps with your requested time (${newStart} to ${newEnd}). Please choose a different time slot.`,
        409
      );
    }

    // Prepare meeting data with proper sanitization
    const meetingData: Prisma.MeetingUncheckedCreateInput = {
      subject: subject?.trim() || "",
      description: description?.trim() || null,
      startTime: start,
      endTime: end,
      duration,
      leadId,
      createdBy: userId,
      location: location?.trim() || null,
      type: type || "Meeting",
      status: status || "Scheduled",
      priority: priority || "Medium",
      agenda: agenda?.trim() || null,
      outcome: outcome?.trim() || null,
      isRecurring: Boolean(isRecurring),
      reminderSent: false,
    };

    // Handle attendees JSON field
    if (attendees && Array.isArray(attendees)) {
      meetingData.attendees = attendees.filter(
        (attendee) => attendee && attendee.trim()
      );
    } else {
      meetingData.attendees = null;
    }

    const meeting = await prisma.meeting.create({
      data: meetingData,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(meeting, "Meeting created successfully");
  } catch (error) {
    console.error("Error creating meeting:", error);
    return errorResponse("Failed to create meeting", 500);
  }
}

// PUT /api/meetings - Bulk update meetings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { userId } = await getEffectiveUserForPermissions(session);

    const canUpdateAll = await PermissionManager.hasPermission(
      userId,
      "meetings.update.all"
    );
    const canUpdateAssigned = await PermissionManager.hasPermission(
      userId,
      "meetings.update.assigned"
    );

    if (!canUpdateAll && !canUpdateAssigned) {
      return errorResponse(
        "Forbidden: You don't have permission to update meetings",
        403
      );
    }

    const body = await request.json();
    const { meetingIds, updates } = body;

    if (!Array.isArray(meetingIds) || meetingIds.length === 0) {
      return errorResponse("Meeting IDs are required", 400);
    }

    if (!updates || typeof updates !== "object") {
      return errorResponse("Updates object is required", 400);
    }

    // Build where clause based on permissions
    const where: Prisma.MeetingWhereInput = {
      id: { in: meetingIds },
    };

    if (!canUpdateAll) {
      where.createdBy = userId;
    }

    // Validate updates object
    const allowedFields = ["status", "priority", "type", "outcome"];
    const validUpdates: Prisma.MeetingUpdateInput = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key as keyof Prisma.MeetingUpdateInput] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return errorResponse("No valid updates provided", 400);
    }

    validUpdates.updatedAt = new Date();

    const result = await prisma.meeting.updateMany({
      where,
      data: validUpdates,
    });

    return successResponse(
      { updatedCount: result.count },
      `${result.count} meeting(s) updated successfully`
    );
  } catch (error) {
    console.error("Error bulk updating meetings:", error);
    return errorResponse("Failed to update meetings", 500);
  }
}
