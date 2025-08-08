import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// GET /api/tasks - Get all tasks with permission filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

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
      console.log("User permissions check failed:", {
        userId,
        hasReadAllTasks,
        hasReadAssignedTasks,
        hasReadDepartmentTasks,
      });
      return errorResponse(
        "Forbidden: You don't have permission to read tasks",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50); // Max 50 items per page

    // Server-side filtering parameters
    const statusFilter = searchParams.get("status");
    const priorityFilter = searchParams.get("priority");
    const categoryFilter = searchParams.get("category");
    const assigneeFilter = searchParams.get("assignee");
    const searchQuery = searchParams.get("search");

    // Server-side sorting parameters
    const sortField = searchParams.get("sortField") || "dueDate";
    const sortDirection = searchParams.get("sortDirection") || "asc";

    const where: Record<string, unknown> = {};
    if (leadId) {
      where.leadId = parseInt(leadId);
    }

    // Apply server-side filters
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    if (priorityFilter && priorityFilter !== "all") {
      where.priority = priorityFilter;
    }

    if (categoryFilter && categoryFilter !== "all") {
      where.category = categoryFilter;
    }

    if (assigneeFilter && assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        where.assignedTo = null;
      } else if (assigneeFilter === "me") {
        where.assignedTo = userId;
      } else {
        // Specific user ID
        const assigneeId = parseInt(assigneeFilter);
        if (!isNaN(assigneeId)) {
          where.assignedTo = assigneeId;
        }
      }
    }

    // Search across task subject, description, lead name, and assignee name
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
          assignee: {
            name: {
              contains: searchQuery.trim(),
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // Apply permission-based filtering
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
        // Combine permission filters with existing OR conditions
        if (where.OR && Array.isArray(where.OR)) {
          // If search filters exist, combine them with permission filters using AND
          where.AND = [
            { OR: where.OR }, // Search conditions
            { OR: permissionFilters }, // Permission conditions
          ];
          delete where.OR;
        } else {
          // No search filters, just apply permission filters
          where.OR = permissionFilters;
        }
      } else {
        // No permission to read any tasks
        return successResponse({
          tasks: [],
          pagination: {
            hasNextPage: false,
            nextCursor: null,
            limit,
          },
        });
      }
    }

    // Build dynamic orderBy based on sort parameters
    const buildOrderBy = () => {
      const orderBy: Array<Record<string, string>> = [];

      // Primary sort field
      if (sortField === "dueDate") {
        orderBy.push({ dueDate: sortDirection });
      } else if (sortField === "priority") {
        // We'll handle priority sorting with separate queries below
        // This ensures proper database-level sorting and pagination
      } else if (sortField === "status") {
        orderBy.push({ status: sortDirection });
      } else if (sortField === "subject") {
        orderBy.push({ subject: sortDirection });
      } else if (sortField === "createdAt") {
        orderBy.push({ createdAt: sortDirection });
      }

      // Secondary sort: always by dueDate for consistency (unless it's primary)
      if (sortField !== "dueDate") {
        orderBy.push({ dueDate: "asc" });
      }

      // Stable sort for pagination
      orderBy.push({ id: "asc" });

      return orderBy;
    };

    // Build pagination options
    const findManyOptions: {
      where: Record<string, unknown>;
      include: Record<string, unknown>;
      orderBy: Array<Record<string, string>>;
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
        assignee: {
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

    let tasks;

    // Execute the query with proper priority handling
    if (sortField === "priority") {
      // Alphabetical order is: ['High', 'Low', 'Medium'] (asc) and ['Medium', 'Low', 'High'] (desc)
      // We want logical priority: ['High', 'Medium', 'Low'] (asc) and ['Low', 'Medium', 'High'] (desc)
      // Since alphabetical doesn't match logical order, we'll use separate queries for each priority level

      const priorityOrder =
        sortDirection === "asc"
          ? ["High", "Medium", "Low"]
          : ["Low", "Medium", "High"];

      const allTasks: Awaited<ReturnType<typeof prisma.task.findMany>> = [];
      let remainingLimit = limit + 1;

      // Fetch tasks for each priority level in the desired order
      for (const priority of priorityOrder) {
        if (remainingLimit <= 0) break;

        const priorityWhere = { ...where, priority };
        const priorityTasks = await prisma.task.findMany({
          where: priorityWhere,
          include: findManyOptions.include,
          orderBy: [{ dueDate: "asc" }, { id: "asc" }],
          take: remainingLimit,
          ...(cursor &&
            allTasks.length === 0 && {
              cursor: { id: parseInt(cursor) },
              skip: 1,
            }),
        });

        allTasks.push(...priorityTasks);
        remainingLimit -= priorityTasks.length;
      }

      // Handle null/undefined priority tasks
      if (remainingLimit > 0) {
        const nullTasks = await prisma.task.findMany({
          where: { ...where, priority: null },
          include: findManyOptions.include,
          orderBy: [{ dueDate: "asc" }, { id: "asc" }],
          take: remainingLimit,
        });
        allTasks.push(...nullTasks);
      }

      tasks = allTasks;
    } else {
      // Normal sorting for non-priority fields
      tasks = await prisma.task.findMany(findManyOptions);
    }

    // Check if there's a next page
    const hasNextPage = tasks.length > limit;
    if (hasNextPage) {
      tasks.pop(); // Remove the extra item
    }

    // Get the next cursor
    const nextCursor =
      hasNextPage && tasks.length > 0 ? tasks[tasks.length - 1].id : null;

    return successResponse({
      tasks,
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return errorResponse("Failed to fetch tasks", 500);
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user has permission to create tasks
    const canCreateTasks = await PermissionManager.hasPermission(
      userId,
      "tasks.create"
    );
    if (!canCreateTasks) {
      return errorResponse(
        "Forbidden: You don't have permission to create tasks",
        403
      );
    }

    const body = await request.json();
    const {
      subject,
      description,
      dueDate,
      priority,
      status,
      category,
      estimatedHours,
      actualHours,
      assignedTo,
      reminderDate,
      tags,
      isRecurring,
      leadId,
    } = body;

    // Basic validation
    if (!subject || !dueDate || !leadId) {
      return errorResponse("Subject, due date, and lead ID are required", 400);
    }

    // Validate optional number fields
    if (
      estimatedHours !== undefined &&
      (isNaN(estimatedHours) || estimatedHours < 0)
    ) {
      return errorResponse("Estimated hours must be a positive number", 400);
    }

    if (actualHours !== undefined && (isNaN(actualHours) || actualHours < 0)) {
      return errorResponse("Actual hours must be a positive number", 400);
    }

    // Validate assignedTo user exists if provided
    if (assignedTo) {
      const assigneeExists = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true },
      });
      if (!assigneeExists) {
        return errorResponse("Assigned user not found", 400);
      }
    }

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Prepare task data with proper sanitization
    const taskData: Prisma.TaskUncheckedCreateInput = {
      subject: subject?.trim() || "",
      description: description?.trim() || null,
      dueDate: new Date(dueDate),
      priority: priority || "Medium",
      status: status || "Pending",
      category: category || "Other",
      leadId,
      createdBy: userId,
    };

    // Add optional fields with proper null handling
    if (estimatedHours !== undefined && estimatedHours !== null) {
      const parsedHours = parseFloat(estimatedHours);
      taskData.estimatedHours = !isNaN(parsedHours) ? parsedHours : null;
    } else {
      taskData.estimatedHours = null;
    }

    if (actualHours !== undefined && actualHours !== null) {
      const parsedHours = parseFloat(actualHours);
      taskData.actualHours = !isNaN(parsedHours) ? parsedHours : null;
    } else {
      taskData.actualHours = null;
    }

    // Handle assignedTo - explicitly allow null for unassigned
    taskData.assignedTo = assignedTo !== undefined ? assignedTo : null;

    if (reminderDate) {
      taskData.reminderDate = new Date(reminderDate);
    } else {
      taskData.reminderDate = null;
    }

    if (tags && Array.isArray(tags)) {
      taskData.tags = tags.filter((tag) => tag && tag.trim()); // Filter empty tags
    } else {
      taskData.tags = [];
    }

    taskData.isRecurring = Boolean(isRecurring);

    const task = await prisma.task.create({
      data: taskData,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(task, "Task created successfully");
  } catch (error) {
    console.error("Error creating task:", error);
    return errorResponse("Failed to create task", 500);
  }
}
