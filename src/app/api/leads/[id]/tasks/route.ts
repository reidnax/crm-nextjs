import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// Helper function to check if user can access a specific lead (shared logic)
async function canAccessLead(
  userId: number,
  leadId: number,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  const hasGlobalPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.all` as any
  );
  if (hasGlobalPermission) return true;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, assign: true, createdBy: true },
  });
  if (!lead) return false;

  const hasAssignedPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.assigned` as any
  );
  if (
    hasAssignedPermission &&
    (lead.assign === userId || lead.createdBy === userId)
  ) {
    return true;
  }

  const hasDepartmentPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.department` as any
  );
  if (hasDepartmentPermission) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      return true;
    }
  }

  return false;
}

// POST /api/leads/[id]/tasks - Create a new task for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead
    const canAccessLeadForTasks = await canAccessLead(userId, leadId, "read");
    if (!canAccessLeadForTasks) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

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
    const { subject, description, dueDate, priority, status } = body;

    // Validate required fields
    if (!subject || !dueDate) {
      return errorResponse("Subject and due date are required", 400);
    }

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        subject,
        description: description || "",
        dueDate: new Date(dueDate),
        priority: priority || "Medium",
        status: status || "Pending",
        leadId,
        createdBy: userId,
      },
      include: {
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

// GET /api/leads/[id]/tasks - Get all tasks for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead
    const canAccessLeadForTasks = await canAccessLead(userId, leadId, "read");
    if (!canAccessLeadForTasks) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

    // Check if user has permission to read tasks
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

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Apply task filtering based on permissions
    let taskFilter: any = { leadId };

    if (!hasReadAllTasks) {
      const permissionFilters = [];

      if (hasReadAssignedTasks) {
        // Can read tasks created by them
        permissionFilters.push({ createdBy: userId });
      }

      if (hasReadDepartmentTasks) {
        // For now, managers can read all tasks in accessible leads
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
          // Managers can read all tasks for leads they can access
          permissionFilters.push({ leadId }); // This will allow all tasks for this lead
        }
      }

      if (permissionFilters.length > 0) {
        taskFilter.OR = permissionFilters;
      } else {
        // No permission to read any tasks
        return successResponse([]);
      }
    }

    // Get tasks based on permission filtering
    const tasks = await prisma.task.findMany({
      where: taskFilter,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: [
        { status: "asc" }, // Pending tasks first
        { dueDate: "asc" }, // Then by due date
      ],
    });

    return successResponse(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return errorResponse("Failed to fetch tasks", 500);
  }
}
