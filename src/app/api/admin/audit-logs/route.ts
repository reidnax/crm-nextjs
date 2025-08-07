/**
 * Admin Audit Logs API Route
 * Provides audit log data for admin dashboard
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

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get filters
    const filters: any = {};

    if (searchParams.get("action")) {
      filters.action = searchParams.get("action");
    }

    if (searchParams.get("userId")) {
      filters.userId = parseInt(searchParams.get("userId")!);
    }

    if (searchParams.get("startDate")) {
      filters.startDate = new Date(searchParams.get("startDate")!);
    }

    if (searchParams.get("endDate")) {
      filters.endDate = new Date(searchParams.get("endDate")!);
    }

    // Fetch audit logs
    const logs = await AuditService.getAllAuditLogs(limit, offset, filters);

    // Get total count for pagination (simplified - in production you'd want a separate count query)
    const totalCount = logs.length; // This is a simplification

    return successResponse({
      logs,
      total: totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return errorResponse("Failed to fetch audit logs", 500);
  }
}
