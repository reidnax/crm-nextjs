import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get lead analytics
    const analytics = await prisma.lead.groupBy({
      by: ["status", "priority", "subStatus"],
      _count: {
        id: true,
      },
      where: {
        // Add user-specific filtering if needed based on permissions
      },
    });

    // Calculate totals
    const total = analytics.reduce((sum, item) => sum + item._count.id, 0);

    // Group by status
    const statusCounts = analytics.reduce((acc, item) => {
      if (!acc[item.status || "Unknown"]) {
        acc[item.status || "Unknown"] = 0;
      }
      acc[item.status || "Unknown"] += item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const priorityCounts = analytics.reduce((acc, item) => {
      if (!acc[item.priority || "Unknown"]) {
        acc[item.priority || "Unknown"] = 0;
      }
      acc[item.priority || "Unknown"] += item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Group by sub status
    const subStatusCounts = analytics.reduce((acc, item) => {
      if (!acc[item.subStatus || "Unknown"]) {
        acc[item.subStatus || "Unknown"] = 0;
      }
      acc[item.subStatus || "Unknown"] += item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const result = {
      total,
      new: (statusCounts["New"] || 0) + (statusCounts["Unassigned"] || 0),
      contacted: statusCounts["Contacted"] || 0,
      qualified: statusCounts["Qualified"] || 0,
      converted: statusCounts["Converted"] || 0,
      hot: subStatusCounts["Hot"] || 0,
      warm: subStatusCounts["Warm"] || 0,
      cold: subStatusCounts["Cold"] || 0,
      high_priority: priorityCounts["High"] || 0,
      medium_priority: priorityCounts["Medium"] || 0,
      low_priority: priorityCounts["Low"] || 0,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching lead analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lead analytics" },
      { status: 500 }
    );
  }
}
