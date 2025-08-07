/**
 * User Permissions API Route
 * Returns permissions for the current authenticated user
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PermissionManager } from "@/lib/permissions/core";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!(session as any)?.user?.id) {
      return errorResponse("Authentication required", 401);
    }

    const userId = parseInt(((session as any)?.user as any)?.id);

    // Get user permissions
    const permissions = await PermissionManager.getUserPermissions(userId);

    return successResponse({
      permissions,
      count: permissions.length,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return errorResponse("Failed to fetch permissions", 500);
  }
}
