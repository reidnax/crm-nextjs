import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MigrationService } from "@/lib/migration-service";

// Helper function to check if user is Admin Dev
async function isAdminDev(session: any): Promise<boolean> {
  return session?.user?.role === "Admin-Dev" || session?.user?.role === "Admin";
}

// GET /api/admin/migrations/logs - Get migration logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(await isAdminDev(session))) {
      return errorResponse("Forbidden: Admin access required", 403);
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

    if (searchParams.get("success")) {
      filters.success = searchParams.get("success") === "true";
    }

    if (searchParams.get("executedBy")) {
      filters.executedBy = parseInt(searchParams.get("executedBy")!);
    }

    if (searchParams.get("startDate")) {
      filters.startDate = new Date(searchParams.get("startDate")!);
    }

    if (searchParams.get("endDate")) {
      filters.endDate = new Date(searchParams.get("endDate")!);
    }

    const result = await MigrationService.getMigrationLogs(limit, offset, filters);

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching migration logs:", error);
    return errorResponse("Failed to fetch migration logs", 500);
  }
} 