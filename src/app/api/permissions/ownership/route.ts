/**
 * Resource Ownership API Route
 * Checks if the current user owns a specific resource
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PermissionManager } from "@/lib/permissions/core";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return errorResponse("Authentication required", 401);
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);

    const resourceType = searchParams.get("resourceType");
    const resourceIdParam = searchParams.get("resourceId");

    if (!resourceType || !resourceIdParam) {
      return errorResponse("resourceType and resourceId are required", 400);
    }

    const resourceId = parseInt(resourceIdParam);

    if (isNaN(resourceId)) {
      return errorResponse("Invalid resourceId", 400);
    }

    // Check ownership
    const isOwner = await PermissionManager.isOwner(
      userId,
      resourceType,
      resourceId
    );

    return successResponse({
      isOwner,
      resourceType,
      resourceId,
      userId,
    });
  } catch (error) {
    console.error("Error checking ownership:", error);
    return errorResponse("Failed to check ownership", 500);
  }
}
