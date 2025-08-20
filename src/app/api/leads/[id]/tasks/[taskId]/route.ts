import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// Helper function to check if user can access this lead
async function canAccessLead(
  userId: number,
  leadId: number,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  // Check if user has permission to read/update/delete all leads
  const hasAllAccess = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.all`
  );
  if (hasAllAccess) return true;

  // Check if user has permission for assigned leads
  const hasAssignedAccess = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.assigned`
  );
  if (hasAssignedAccess) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { assign: true, createdBy: true },
    });
    if (lead && (lead.assign === userId || lead.createdBy === userId)) {
      return true;
    }
  }

  // Check if user has department access (for managers)
  const hasDepartmentAccess = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.department`
  );
  if (hasDepartmentAccess) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "Manager" || user?.role === "Admin") {
      return true;
    }
  }

  return false;
}

// Helper function to check if user can access a specific task
async function canAccessTask(
  userId: number,
  taskId: number,
  action: "read" | "update" | "delete"
): Promise<{ canAccess: boolean; task?: any; lead?: any }> {
  // Get the task with lead information
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      lead: { select: { id: true, assign: true, createdBy: true } },
      creator: { select: { id: true } },
      assignee: { select: { id: true } },
    },
  });

  if (!task) {
    return { canAccess: false };
  }

  // Check task-specific permissions
  const hasAllTaskAccess = await PermissionManager.hasPermission(
    userId,
    `tasks.${action}.all`
  );
  if (hasAllTaskAccess) {
    return { canAccess: true, task, lead: task.lead };
  }

  // Check if user has permission for assigned tasks
  const hasAssignedTaskAccess = await PermissionManager.hasPermission(
    userId,
    `tasks.${action}.assigned`
  );
  if (hasAssignedTaskAccess) {
    // User can access if they created the task or are assigned to it
    if (task.createdBy === userId || task.assignedTo === userId) {
      return { canAccess: true, task, lead: task.lead };
    }
  }

  // Check department access for managers
  const hasDepartmentTaskAccess = await PermissionManager.hasPermission(
    userId,
    `tasks.${action}.department`
  );
  if (hasDepartmentTaskAccess) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "Manager" || user?.role === "Admin") {
      return { canAccess: true, task, lead: task.lead };
    }
  }

  return { canAccess: false };
}

// GET /api/leads/[id]/tasks/[taskId] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    const taskId = parseInt(resolvedParams.taskId);

    if (isNaN(leadId) || isNaN(taskId)) {
      return errorResponse("Invalid lead ID or task ID", 400);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this task
    const { canAccess, task } = await canAccessTask(userId, taskId, "read");
    if (!canAccess) {
      return errorResponse(
        "Forbidden: You don't have access to this task",
        403
      );
    }

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return successResponse(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return errorResponse("Failed to fetch task", 500);
  }
}

// PUT /api/leads/[id]/tasks/[taskId] - Update a specific task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    const taskId = parseInt(resolvedParams.taskId);

    if (isNaN(leadId) || isNaN(taskId)) {
      return errorResponse("Invalid lead ID or task ID", 400);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can update this task
    const { canAccess, task } = await canAccessTask(userId, taskId, "update");
    if (!canAccess) {
      return errorResponse(
        "Forbidden: You don't have access to update this task",
        403
      );
    }

    if (!task) {
      return errorResponse("Task not found", 404);
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
      completedAt,
    } = body;

    // Validate required fields if provided
    if (subject !== undefined && !subject.trim()) {
      return errorResponse("Subject cannot be empty", 400);
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
    if (assignedTo !== undefined && assignedTo !== null) {
      const assigneeExists = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true },
      });
      if (!assigneeExists) {
        return errorResponse("Assigned user not found", 400);
      }
    }

    // Prepare update data with proper sanitization
    const updateData: any = {};

    if (subject !== undefined) updateData.subject = subject?.trim() || "";
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completedAt when task is marked as completed
      if (status === "Completed" && !task.completedAt) {
        updateData.completedAt = new Date();
      } else if (status !== "Completed") {
        updateData.completedAt = null;
      }
    }
    if (category !== undefined) updateData.category = category;

    // Handle numeric fields with proper null handling
    if (estimatedHours !== undefined) {
      if (estimatedHours === null || estimatedHours === "") {
        updateData.estimatedHours = null;
      } else {
        const parsed = parseFloat(estimatedHours);
        updateData.estimatedHours = !isNaN(parsed) ? parsed : null;
      }
    }

    if (actualHours !== undefined) {
      if (actualHours === null || actualHours === "") {
        updateData.actualHours = null;
      } else {
        const parsed = parseFloat(actualHours);
        updateData.actualHours = !isNaN(parsed) ? parsed : null;
      }
    }

    // Handle assignedTo - explicitly allow null for unassigned
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    if (reminderDate !== undefined) {
      updateData.reminderDate = reminderDate ? new Date(reminderDate) : null;
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? tags.filter((tag) => tag && tag.trim())
        : [];
    }

    if (isRecurring !== undefined)
      updateData.isRecurring = Boolean(isRecurring);
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;

    // Update the task with transaction isolation to ensure data consistency
    const updatedTask = await prisma.$transaction(async (tx) => {
      console.log(
        `⚡ Updating task ${taskId} in transaction - ensuring data consistency`
      );
      return await tx.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          creator: {
            select: { id: true, name: true, username: true },
          },
          assignee: {
            select: { id: true, name: true, username: true },
          },
          lead: {
            select: { id: true, name: true, company: true },
          },
        },
      });
    });

    console.log(
      `✅ Task ${taskId} updated successfully - analytics should now see fresh data`
    );

    return successResponse(updatedTask, "Task updated successfully");
  } catch (error) {
    console.error("Error updating task:", error);
    return errorResponse("Failed to update task", 500);
  }
}

// DELETE /api/leads/[id]/tasks/[taskId] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    const taskId = parseInt(resolvedParams.taskId);

    if (isNaN(leadId) || isNaN(taskId)) {
      return errorResponse("Invalid lead ID or task ID", 400);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can delete this task
    const { canAccess, task } = await canAccessTask(userId, taskId, "delete");
    if (!canAccess) {
      return errorResponse(
        "Forbidden: You don't have access to delete this task",
        403
      );
    }

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Soft delete the task
    await prisma.task.update({
      where: { id: taskId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    return successResponse(null, "Task deleted successfully");
  } catch (error) {
    console.error("Error deleting task:", error);
    return errorResponse("Failed to delete task", 500);
  }
}
