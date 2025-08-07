/**
 * Resource Access API Route
 * Checks if the current user can access a specific resource with a given action
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PermissionManager } from "@/lib/permissions/core";
import { PermissionKey } from "@/lib/permissions/permission-matrix";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return errorResponse("Authentication required", 401);
    }

    const userId = parseInt(session?.user?.id || "0");
    const { searchParams } = new URL(request.url);

    const resourceType = searchParams.get("resourceType");
    const resourceIdParam = searchParams.get("resourceId");
    const action = searchParams.get("action");

    if (!resourceType || !resourceIdParam || !action) {
      return errorResponse(
        "resourceType, resourceId, and action are required",
        400
      );
    }

    const resourceId = parseInt(resourceIdParam);

    if (isNaN(resourceId)) {
      return errorResponse("Invalid resourceId", 400);
    }

    // Build permission names to check
    const globalPermission = `${resourceType}.${action}.all` as PermissionKey;
    const assignedPermission =
      `${resourceType}.${action}.assigned` as PermissionKey;
    const departmentPermission =
      `${resourceType}.${action}.department` as PermissionKey;

    // Check global permission first
    const hasGlobalPermission = await PermissionManager.hasPermission(
      userId,
      globalPermission
    );

    if (hasGlobalPermission) {
      return successResponse({
        canAccess: true,
        reason: "global_permission",
        permission: globalPermission,
      });
    }

    // Check ownership + assigned permission
    const isOwner = await PermissionManager.isOwner(
      userId,
      resourceType,
      resourceId
    );
    const hasAssignedPermission = await PermissionManager.hasPermission(
      userId,
      assignedPermission
    );

    if (isOwner && hasAssignedPermission) {
      return successResponse({
        canAccess: true,
        reason: "ownership_and_permission",
        permission: assignedPermission,
        isOwner: true,
      });
    }

    // Check department permission (for managers)
    const hasDepartmentPermission = await PermissionManager.hasPermission(
      userId,
      departmentPermission
    );

    if (hasDepartmentPermission) {
      // In a full implementation, we'd verify the resource belongs to the user's department
      return successResponse({
        canAccess: true,
        reason: "department_permission",
        permission: departmentPermission,
      });
    }

    // No access
    return successResponse({
      canAccess: false,
      reason: "insufficient_permissions",
      checkedPermissions: [
        globalPermission,
        assignedPermission,
        departmentPermission,
      ],
      isOwner,
    });
  } catch (error) {
    console.error("Error checking resource access:", error);
    return errorResponse("Failed to check resource access", 500);
  }
}
