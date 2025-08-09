import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DailyReportCreateAPISchema,
  DailyReportQuerySchema,
} from "@/lib/validations/daily-report";
import { isLateSubmission, toMonthKey } from "@/lib/timezone-utils";
import {
  emitDailyReportSubmitted,
  createDailyReportPayload,
} from "@/lib/events/bus";
import { RoleHierarchy, PermissionManager } from "@/lib/permissions/core";

/**
 * POST /api/reports/daily
 * Create a new daily activity report
 */
export async function POST(request: NextRequest) {
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

    // Check if user has permission to create reports
    const canCreateReports = await PermissionManager.hasPermission(
      sessionUserId,
      "reports.daily.create"
    );

    if (!canCreateReports) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message:
              "Access denied. You don't have permission to create daily reports.",
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DailyReportCreateAPISchema.parse(body);

    // Determine executive ID for the report
    let executiveId = sessionUserId;
    if (
      validatedData.executiveId &&
      validatedData.executiveId !== sessionUserId
    ) {
      // Check if user can create reports for others (Manager+ level)
      if (userLevel < 50) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only create reports for yourself",
            },
          },
          { status: 403 }
        );
      }
      executiveId = validatedData.executiveId;
    }

    // Verify the executive exists and is active
    const executive = await prisma.user.findUnique({
      where: { id: executiveId, active: true },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!executive) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Executive not found or inactive",
          },
        },
        { status: 404 }
      );
    }

    // Compute server-side fields
    const now = new Date();
    const monthKey = toMonthKey(validatedData.reportDate);
    const isLate = isLateSubmission(validatedData.reportDate, now);

    // Check for existing report (unique constraint)
    const existingReport = await prisma.dailyActivityReport.findUnique({
      where: {
        executiveId_reportDate: {
          executiveId,
          reportDate: validatedData.reportDate,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "CONFLICT",
            message: `A report already exists for ${
              executive.name || executive.email
            } on ${validatedData.reportDate.toISOString().split("T")[0]}`,
          },
        },
        { status: 409 }
      );
    }

    // Create the daily report
    const createdReport = await prisma.dailyActivityReport.create({
      data: {
        reportDate: validatedData.reportDate,
        executiveId,
        zone: validatedData.zone,
        salesUnitsToday: validatedData.salesUnitsToday,
        collectionsTodayINR: validatedData.collectionsTodayINR,
        dealerMeetingsCount: validatedData.dealerMeetingsCount,
        plantVisitsCount: validatedData.plantVisitsCount,
        newDealershipVisitsCount: validatedData.newDealershipVisitsCount,
        notes: validatedData.notes,
        monthKey,
        submittedAt: now,
        submittedBy: sessionUserId,
        isLateSubmission: isLate,
        geoCity: validatedData.geoCity,
        geoLat: validatedData.geoLat,
        geoLon: validatedData.geoLon,
      },
      include: {
        executive: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Emit event for automations
    const eventPayload = createDailyReportPayload(createdReport);
    emitDailyReportSubmitted(eventPayload);

    // Revalidate overview cache
    revalidateTag("daily-overview");

    return NextResponse.json({
      ok: true,
      data: {
        ...createdReport,
        collectionsTodayINR: Number(createdReport.collectionsTodayINR),
        geoLat: createdReport.geoLat ? Number(createdReport.geoLat) : null,
        geoLon: createdReport.geoLon ? Number(createdReport.geoLon) : null,
      },
    });
  } catch (error) {
    console.error("Error creating daily report:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
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
          message: "Failed to create daily report",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/daily?date=YYYY-MM-DD&executiveId=123
 * Get daily report by date and executive
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
      date: searchParams.get("date") || undefined,
      executiveId: searchParams.get("executiveId") || undefined,
    };

    const validatedQuery = DailyReportQuerySchema.pick({
      date: true,
      executiveId: true,
    }).parse(queryData);

    if (!validatedQuery.date) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Date parameter is required",
          },
        },
        { status: 400 }
      );
    }

    // Determine which executive's report to fetch
    let targetExecutiveId = sessionUserId;
    if (validatedQuery.executiveId) {
      // Check if user can view others' reports
      const canViewAllReports = await PermissionManager.hasPermission(
        sessionUserId,
        "reports.daily.read.all"
      );

      if (!canViewAllReports && validatedQuery.executiveId !== sessionUserId) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only view your own reports",
            },
          },
          { status: 403 }
        );
      }
      targetExecutiveId = validatedQuery.executiveId;
    }

    // Find the report
    const report = await prisma.dailyActivityReport.findUnique({
      where: {
        executiveId_reportDate: {
          executiveId: targetExecutiveId,
          reportDate: new Date(validatedQuery.date),
        },
      },
      include: {
        executive: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "Daily report not found" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...report,
        collectionsTodayINR: Number(report.collectionsTodayINR),
        geoLat: report.geoLat ? Number(report.geoLat) : null,
        geoLon: report.geoLon ? Number(report.geoLon) : null,
      },
    });
  } catch (error) {
    console.error("Error fetching daily report:", error);

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
          message: "Failed to fetch daily report",
        },
      },
      { status: 500 }
    );
  }
}
