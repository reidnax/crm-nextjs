import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

/**
 * GET /api/kpi/goals/[id]/action-items
 * Returns all action items for a goal.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) return errorResponse("Invalid id", 400);

    const goal = await prisma.kpiGoal.findUnique({ where: { id: goalId } });
    if (!goal) return errorResponse("Goal not found", 404);

    const items = await prisma.kpiActionItem.findMany({
      where: { goalId },
      orderBy: { createdAt: "asc" },
      include: { createdByUser: { select: { id: true, name: true } } },
    });

    return successResponse(items);
  } catch (error) {
    console.error("GET /api/kpi/goals/[id]/action-items error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/kpi/goals/[id]/action-items
 * Body: { title, description?, target?, actual?, owner?, dueDate?, status?, notes? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const { userId } = await getEffectiveUserForPermissions(session);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, department: true },
    });
    if (!user) return errorResponse("User not found", 404);

    const { id } = await params;
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) return errorResponse("Invalid id", 400);

    const goal = await prisma.kpiGoal.findUnique({
      where: { id: goalId },
      include: { department: true },
    });
    if (!goal) return errorResponse("Goal not found", 404);

    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === goal.department.key;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only add action items to goals in your own department", 403);
    }

    const body = await request.json();
    const { title, description, target, actual, owner, dueDate, status, notes } = body;

    if (!title) return errorResponse("title is required", 400);

    const validStatuses = ["open", "in-progress", "done", "blocked"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(`status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const item = await prisma.kpiActionItem.create({
      data: {
        goalId,
        title,
        description: description || null,
        target: target || null,
        actual: actual || null,
        owner: owner || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "open",
        notes: notes || null,
        createdBy: userId,
      },
      include: { createdByUser: { select: { id: true, name: true } } },
    });

    return successResponse(item);
  } catch (error) {
    console.error("POST /api/kpi/goals/[id]/action-items error:", error);
    return errorResponse("Internal server error", 500);
  }
}
