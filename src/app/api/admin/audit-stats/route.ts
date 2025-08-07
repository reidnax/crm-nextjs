/**
 * Admin Audit Statistics API Route
 * Provides statistical data for audit dashboard
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AuditService } from "@/lib/permissions/audit-service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isAdminRole } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!(session as any)?.user?.id) {
      return errorResponse("Authentication required", 401);
    }

    // Check if user has admin role
    const userRole = ((session as any)?.user as any)?.role;
    if (!isAdminRole(userRole)) {
      return errorResponse("Insufficient permissions", 403);
    }

    const { searchParams } = new URL(request.url);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (searchParams.get("startDate")) {
      startDate = new Date(searchParams.get("startDate")!);
    }

    if (searchParams.get("endDate")) {
      endDate = new Date(searchParams.get("endDate")!);
    }

    // Fetch audit statistics
    const stats = await AuditService.getAuditStats(startDate, endDate);

    return successResponse({
      stats,
    });
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    return errorResponse("Failed to fetch audit statistics", 500);
  }
}
