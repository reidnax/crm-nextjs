import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/meta/zones
 * Get list of zones used in daily reports for autocomplete/selection
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

    // Get distinct zones from existing daily reports
    const zones = await prisma.dailyActivityReport.findMany({
      select: {
        zone: true,
      },
      distinct: ["zone"],
      orderBy: {
        zone: "asc",
      },
    });

    // Extract zone names and filter out any null values
    const zoneList = zones
      .map((z) => z.zone)
      .filter((zone): zone is string => zone !== null)
      .sort();

    // Also include some common zones if the list is empty
    if (zoneList.length === 0) {
      const defaultZones = [
        "Mumbai",
        "Delhi",
        "Bangalore",
        "Chennai",
        "Kolkata",
        "Hyderabad",
        "Pune",
      ];
      zoneList.push(...defaultZones);
    }

    return NextResponse.json({
      ok: true,
      data: {
        zones: zoneList,
        count: zoneList.length,
      },
    });
  } catch (error) {
    console.error("Error fetching zones:", error);

    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch zones" },
      },
      { status: 500 }
    );
  }
}
