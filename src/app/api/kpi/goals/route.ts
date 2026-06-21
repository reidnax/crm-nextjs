import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

const ELEVATED_ROLES = ["Admin", "Admin-Dev", "Manager"];

/**
 * GET /api/kpi/goals
 * Query params:
 *   - department (key, required)
 *   - year       (e.g. "2026", default current year)
 *   - parentId   (number, "null" for top-level only)
 *   - level      ("yearly"|"quarterly"|"monthly"|"daily")
 * Returns goals with their direct children count and action item count.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const departmentKey = searchParams.get("department");
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const parentIdParam = searchParams.get("parentId");
    const level = searchParams.get("level");

    if (!departmentKey) return errorResponse("department is required", 400);

    const dept = await prisma.kpiDepartment.findUnique({ where: { key: departmentKey } });
    if (!dept) return errorResponse("Department not found", 404);

    const where: Record<string, unknown> = { departmentId: dept.id };

    // Filter by level
    if (level) where.level = level;

    // Filter by parentId
    if (parentIdParam === "null" || parentIdParam === null) {
      // Top-level: yearly goals for the given year
      where.parentId = null;
      where.periodLabel = year;
    } else if (parentIdParam) {
      where.parentId = parseInt(parentIdParam, 10);
    }

    // If no parentId param given and no level, default to yearly for the year
    if (!parentIdParam && !level) {
      where.parentId = null;
      where.periodLabel = year;
    }

    const goals = await prisma.kpiGoal.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        enteredByUser: { select: { id: true, name: true } },
        _count: {
          select: { children: true, actionItems: true },
        },
      },
    });

    return successResponse(goals);
  } catch (error) {
    console.error("GET /api/kpi/goals error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/kpi/goals
 * Body: { departmentKey, parentId?, level, name, unit?, periodLabel, target?, higherIsBetter?, notes?, sortOrder? }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);

    const { userId } = await getEffectiveUserForPermissions(session);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, department: true },
    });
    if (!user) return errorResponse("User not found", 404);

    const body = await request.json();
    const {
      departmentKey,
      parentId,
      level,
      name,
      unit,
      periodLabel,
      target,
      actual,
      status,
      higherIsBetter,
      notes,
      sortOrder,
    } = body;

    if (!departmentKey || !level || !name || !periodLabel) {
      return errorResponse("departmentKey, level, name, and periodLabel are required", 400);
    }

    const validLevels = ["yearly", "quarterly", "monthly", "weekly", "daily"];
    if (!validLevels.includes(level)) {
      return errorResponse(`level must be one of: ${validLevels.join(", ")}`, 400);
    }

    const dept = await prisma.kpiDepartment.findUnique({ where: { key: departmentKey } });
    if (!dept) return errorResponse("Department not found", 404);

    // Access control
    const isElevated = ELEVATED_ROLES.includes(user.role || "");
    const isOwnDept = user.department === departmentKey;
    if (!isElevated && !isOwnDept) {
      return errorResponse("You can only create KPI goals for your own department", 403);
    }

    // Validate parent exists if provided
    if (parentId) {
      const parent = await prisma.kpiGoal.findUnique({ where: { id: parentId } });
      if (!parent) return errorResponse("Parent goal not found", 404);
      if (parent.departmentId !== dept.id) {
        return errorResponse("Parent goal belongs to a different department", 400);
      }
    }

    const goal = await prisma.kpiGoal.create({
      data: {
        departmentId: dept.id,
        parentId: parentId || null,
        level,
        name,
        unit: unit || null,
        periodLabel,
        target: target || null,
        actual: actual || null,
        status: status || null,
        higherIsBetter: higherIsBetter !== false,
        notes: notes || null,
        sortOrder: sortOrder ?? 0,
        enteredBy: userId,
      },
      include: {
        enteredByUser: { select: { id: true, name: true } },
        _count: { select: { children: true, actionItems: true } },
      },
    });

    return successResponse(goal);
  } catch (error) {
    console.error("POST /api/kpi/goals error:", error);
    return errorResponse("Internal server error", 500);
  }
}
