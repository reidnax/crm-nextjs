import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DailyReportOverviewQuerySchema } from "@/lib/validations/daily-report";
import {
  todayInIST,
  getMonthRangeBounds,
  getDayBoundsIST,
} from "@/lib/timezone-utils";
import { RoleHierarchy } from "@/lib/permissions/core";

// Enable dynamic rendering for authentication
export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/daily-overview
 * Get today's snapshot and optional monthly analytics for daily reports
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and validate auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }

    const sessionUserId = parseInt(session.user.id);
    const userRole = session.user.role || "";
    const userLevel = RoleHierarchy.getRoleLevel(userRole);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      fromMonth: searchParams.get("fromMonth") || undefined,
      toMonth: searchParams.get("toMonth") || undefined,
      executiveId: searchParams.get("executiveId") || undefined,
      zone: searchParams.get("zone") || undefined,
    };

    // For today's data, we don't require month range validation
    const hasMonthRange = queryData.fromMonth && queryData.toMonth;

    // Get today's bounds in IST
    const today = todayInIST();
    const todayBounds = getDayBoundsIST(today);

    // Build base where clause for RBAC
    const buildWhereClause = (dateFilter: any) => {
      const whereClause: any = dateFilter;

      // Apply RBAC filtering
      if (userLevel < 50) {
        // Assignees can only see their own data
        whereClause.executiveId = sessionUserId;
      } else {
        // Managers and above can filter by executive and zone
        if (queryData.executiveId) {
          whereClause.executiveId = parseInt(queryData.executiveId);
        }
      }

      if (queryData.zone) {
        whereClause.zone = queryData.zone;
      }

      return whereClause;
    };

    // Get today's snapshot
    const todayWhere = buildWhereClause({
      reportDate: {
        gte: todayBounds.start,
        lte: todayBounds.end,
      },
    });

    const todayAggregates = await prisma.dailyActivityReport.aggregate({
      where: todayWhere,
      _sum: {
        salesUnitsToday: true,
        collectionsTodayINR: true,
        dealerMeetingsCount: true,
        plantVisitsCount: true,
        newDealershipVisitsCount: true,
      },
    });

    const analytics = {
      todaySalesUnits: todayAggregates._sum.salesUnitsToday || 0,
      todayCollectionsINR: Number(
        todayAggregates._sum.collectionsTodayINR || 0
      ),
      todayVisitsTotal:
        (todayAggregates._sum.dealerMeetingsCount || 0) +
        (todayAggregates._sum.plantVisitsCount || 0) +
        (todayAggregates._sum.newDealershipVisitsCount || 0),
    };

    // If month range is provided, add monthly totals
    if (hasMonthRange) {
      try {
        const range = getMonthRangeBounds(
          queryData.fromMonth!,
          queryData.toMonth!
        );

        const monthlyWhere = buildWhereClause({
          reportDate: {
            gte: range.start,
            lte: range.end,
          },
        });

        const monthlyAggregates = await prisma.dailyActivityReport.aggregate({
          where: monthlyWhere,
          _sum: {
            salesUnitsToday: true,
            collectionsTodayINR: true,
            dealerMeetingsCount: true,
            plantVisitsCount: true,
            newDealershipVisitsCount: true,
          },
        });

        (analytics as any).monthlyTotals = {
          salesUnits: monthlyAggregates._sum.salesUnitsToday || 0,
          collectionsINR: Number(
            monthlyAggregates._sum.collectionsTodayINR || 0
          ),
          visitsTotal:
            (monthlyAggregates._sum.dealerMeetingsCount || 0) +
            (monthlyAggregates._sum.plantVisitsCount || 0) +
            (monthlyAggregates._sum.newDealershipVisitsCount || 0),
        };
      } catch (monthError) {
        console.error("Error fetching monthly data:", monthError);
        // Continue without monthly data if there's an error
      }
    }

    return NextResponse.json({ ok: true, data: analytics });
  } catch (error) {
    console.error("Error fetching daily analytics:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch analytics data",
        },
      },
      { status: 500 }
    );
  }
}
