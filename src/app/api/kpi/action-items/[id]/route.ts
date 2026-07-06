import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

async function resolvePermissions(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) return null;
  const { userId } = await getEffectiveUserForPermissions(session!);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, department: true },
  });
  return user ? { ...user, userId } : null;
}

/**
 * PATCH /api/kpi/action-items/[id]
 * Updatable: title, description, target, actual, owner, dueDate, completedAt, status, notes
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const user = await resolvePermissions(session);
    if (!user) return errorResponse("User not found", 404);

    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) return errorResponse("Invalid id", 400);

    const existing = await prisma.kpiActionItem.findUnique({
      where: { id: itemId },
      include: { goal: { include: { department: true } } },
    });
    if (!existing) return errorResponse("Action item not found", 404);

    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === existing.goal.department.key;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only update action items in your own department", 403);
    }

    const body = await request.json();
    const allowedFields = ["title", "description", "target", "actual", "owner", "dueDate", "completedAt", "status", "notes", "goalId"];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if ((field === "dueDate" || field === "completedAt") && body[field]) {
          data[field] = new Date(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    }

    const validStatuses = ["open", "in-progress", "done", "blocked"];
    if (data.status && !validStatuses.includes(data.status as string)) {
      return errorResponse(`status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    // Auto-set completedAt when marking done
    if (data.status === "done" && !existing.completedAt && !data.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await prisma.kpiActionItem.update({
      where: { id: itemId },
      data,
      include: { createdByUser: { select: { id: true, name: true } } },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("PATCH /api/kpi/action-items/[id] error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/kpi/action-items/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const user = await resolvePermissions(session);
    if (!user) return errorResponse("User not found", 404);

    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) return errorResponse("Invalid id", 400);

    const existing = await prisma.kpiActionItem.findUnique({
      where: { id: itemId },
      include: { goal: { include: { department: true } } },
    });
    if (!existing) return errorResponse("Action item not found", 404);

    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === existing.goal.department.key;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only delete action items in your own department", 403);
    }

    await prisma.kpiActionItem.delete({ where: { id: itemId } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/kpi/action-items/[id] error:", error);
    return errorResponse("Internal server error", 500);
  }
}
