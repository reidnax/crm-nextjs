import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

/**
 * GET /api/kpi/goals/[id]
 * Returns the goal with its immediate children and action items.
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

    const { searchParams } = new URL(_request.url);
    const full = searchParams.get("full") === "true";

    // Leaf-level include (no further children needed)
    const leafInclude = {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        _count: { select: { children: true, actionItems: true } },
      },
    };

    const goal = await prisma.kpiGoal.findUnique({
      where: { id: goalId },
      include: {
        department: { select: { key: true, name: true } },
        enteredByUser: { select: { id: true, name: true } },
        actionItems: {
          orderBy: { createdAt: "asc" },
          include: { createdByUser: { select: { id: true, name: true } } },
        },
        _count: { select: { children: true, actionItems: true } },
        // Full recursive include: Q → M → W → D  (4 sub-levels)
        children: full
          ? {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              include: {
                _count: { select: { children: true, actionItems: true } },
                children: {
                  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                  include: {
                    _count: { select: { children: true, actionItems: true } },
                    children: {
                      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                      include: {
                        _count: { select: { children: true, actionItems: true } },
                        children: { ...leafInclude },
                      },
                    },
                  },
                },
              },
            }
          : {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              include: {
                _count: { select: { children: true, actionItems: true } },
                enteredByUser: { select: { id: true, name: true } },
              },
            },
      },
    });

    if (!goal) return errorResponse("Goal not found", 404);

    return successResponse(goal);
  } catch (error) {
    console.error("GET /api/kpi/goals/[id] error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/kpi/goals/[id]
 * Updatable fields: name, unit, target, actual, actualNumeric, status, higherIsBetter, notes, sortOrder
 */
export async function PATCH(
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

    const existing = await prisma.kpiGoal.findUnique({
      where: { id: goalId },
      include: { department: true },
    });
    if (!existing) return errorResponse("Goal not found", 404);

    // Access control
    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === existing.department.key;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only update goals in your own department", 403);
    }

    const body = await request.json();
    const allowedFields = [
      "name", "unit", "target", "actual", "actualNumeric",
      "status", "higherIsBetter", "notes", "sortOrder", "periodLabel", "parentId",
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }
    // Always update who entered it last
    data.enteredBy = userId;

    const updated = await prisma.kpiGoal.update({
      where: { id: goalId },
      data,
      include: {
        enteredByUser: { select: { id: true, name: true } },
        _count: { select: { children: true, actionItems: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("PATCH /api/kpi/goals/[id] error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/kpi/goals/[id]
 * Cascades to children and action items.
 */
export async function DELETE(
  _request: Request,
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

    const existing = await prisma.kpiGoal.findUnique({
      where: { id: goalId },
      include: { department: true },
    });
    if (!existing) return errorResponse("Goal not found", 404);

    // Only elevated roles can delete — department owners cannot delete yearly goals accidentally
    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === existing.department.key;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only delete goals in your own department", 403);
    }

    await prisma.kpiGoal.delete({ where: { id: goalId } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/kpi/goals/[id] error:", error);
    return errorResponse("Internal server error", 500);
  }
}
