import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DailyReportOverviewQuerySchema } from "@/lib/validations/daily-report";
import { getMonthRangeBounds } from "@/lib/timezone-utils";
import { RoleHierarchy } from "@/lib/permissions/core";

// Enable dynamic rendering for authentication
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/daily/overview
 * Get aggregated daily report overview with date range filtering
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
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      fromMonth: searchParams.get("fromMonth") || undefined,
      toMonth: searchParams.get("toMonth") || undefined,
      executiveId: searchParams.get("executiveId") || undefined,
      zone: searchParams.get("zone") || undefined,
    };

    const validatedQuery = DailyReportOverviewQuerySchema.parse(queryData);

    // Determine date range
    let fromDate: Date;
    let toDate: Date;

    if (validatedQuery.from && validatedQuery.to) {
      fromDate = new Date(validatedQuery.from);
      toDate = new Date(validatedQuery.to);
    } else if (validatedQuery.fromMonth && validatedQuery.toMonth) {
      const range = getMonthRangeBounds(
        validatedQuery.fromMonth,
        validatedQuery.toMonth
      );
      fromDate = range.start;
      toDate = range.end;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Either date range or month range is required",
          },
        },
        { status: 400 }
      );
    }

    // Build where clause with RBAC filters
    const whereClause: any = {
      reportDate: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Apply RBAC filtering
    if (userLevel < 50) {
      // Assignees can only see their own data
      whereClause.executiveId = sessionUserId;
    } else {
      // Managers and above can filter by executive and zone
      if (validatedQuery.executiveId) {
        whereClause.executiveId = validatedQuery.executiveId;
      }
    }

    if (validatedQuery.zone) {
      whereClause.zone = validatedQuery.zone;
    }

    // Get aggregated totals
    const aggregates = await prisma.dailyActivityReport.aggregate({
      where: whereClause,
      _sum: {
        salesUnitsToday: true,
        collectionsTodayINR: true,
        dealerMeetingsCount: true,
        plantVisitsCount: true,
        newDealershipVisitsCount: true,
      },
    });

    // Get daily breakdown using groupBy
    const dailyData = await prisma.dailyActivityReport.groupBy({
      by: ["reportDate"],
      where: whereClause,
      _sum: {
        salesUnitsToday: true,
        collectionsTodayINR: true,
        dealerMeetingsCount: true,
        plantVisitsCount: true,
        newDealershipVisitsCount: true,
      },
      orderBy: {
        reportDate: "asc",
      },
    });

    // Format the daily breakdown
    const groupByDay = dailyData.map((day) => ({
      date: day.reportDate.toISOString().split("T")[0],
      salesUnits: day._sum.salesUnitsToday || 0,
      collectionsINR: Number(day._sum.collectionsTodayINR || 0),
      visitsTotal:
        (day._sum.dealerMeetingsCount || 0) +
        (day._sum.plantVisitsCount || 0) +
        (day._sum.newDealershipVisitsCount || 0),
    }));

    const overview = {
      totalSalesUnits: aggregates._sum.salesUnitsToday || 0,
      totalCollectionsINR: Number(aggregates._sum.collectionsTodayINR || 0),
      totalDealerMeetings: aggregates._sum.dealerMeetingsCount || 0,
      totalPlantVisits: aggregates._sum.plantVisitsCount || 0,
      totalNewDealershipVisits: aggregates._sum.newDealershipVisitsCount || 0,
      groupByDay,
    };

    return NextResponse.json({ ok: true, data: overview });
  } catch (error) {
    console.error("Error fetching daily report overview:", error);

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
          message: "Failed to fetch overview data",
        },
      },
      { status: 500 }
    );
  }
}
