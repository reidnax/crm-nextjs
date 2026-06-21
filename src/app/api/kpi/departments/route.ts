import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * GET /api/kpi/departments
 * Returns all active KPI departments with a status summary derived from
 * KpiGoal entries for the current year (all levels, not just yearly).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const departments = await prisma.kpiDepartment.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const currentYear = new Date().getFullYear().toString();

    // Compute status from actual vs target (same logic as the frontend)
    function computeStatus(g: {
      actual: string | null; target: string | null; higherIsBetter: boolean;
    }): "green" | "yellow" | "red" | "none" {
      const a = parseFloat(g.actual ?? ""), t = parseFloat(g.target ?? "");
      if (isNaN(a) || isNaN(t) || t === 0) return "none";
      const ratio = a / t;
      if (g.higherIsBetter) {
        return ratio >= 1.0 ? "green" : ratio >= 0.8 ? "yellow" : "red";
      } else {
        return ratio <= 1.0 ? "green" : ratio <= 1.2 ? "yellow" : "red";
      }
    }

    const departmentsWithStatus = await Promise.all(
      departments.map(async (dept) => {
        // Fetch actual + target so we can compute status (status column is no longer stored)
        const goals = await prisma.kpiGoal.findMany({
          where: { departmentId: dept.id },
          select: { actual: true, target: true, higherIsBetter: true, level: true, periodLabel: true },
        });

        const statuses = goals.map(computeStatus);
        const green  = statuses.filter((s) => s === "green").length;
        const yellow = statuses.filter((s) => s === "yellow").length;
        const red    = statuses.filter((s) => s === "red").length;
        const total  = goals.length;

        // Yearly goals for the current year — most meaningful for the overview card
        const yearlyGoals = goals.filter(
          (g) => g.level === "yearly" && g.periodLabel === currentYear
        );
        const yearlyWithData = yearlyGoals.filter(
          (g) => computeStatus(g) !== "none"
        ).length;

        return {
          id: dept.id,
          key: dept.key,
          name: dept.name,
          description: dept.description,
          sortOrder: dept.sortOrder,
          totalGoals: total,
          yearlyGoals: yearlyGoals.length,
          goalsWithStatus: green + yellow + red,
          statusSummary: {
            green,
            yellow,
            red,
            notEntered: total - (green + yellow + red),
          },
          yearlyStatusSummary: {
            total: yearlyGoals.length,
            withStatus: yearlyWithData,
          },
        };
      })
    );

    return successResponse(departmentsWithStatus);
  } catch (error) {
    console.error("GET /api/kpi/departments error:", error);
    return errorResponse("Internal server error", 500);
  }
}
