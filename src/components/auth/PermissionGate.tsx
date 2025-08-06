"use client";

/**
 * Permission Gate Component
 * Controls access to UI elements based on user permissions
 */

import React from "react";
import { usePermissions } from "@/contexts/PermissionContext";
import { PermissionKey } from "@/lib/permissions/permission-matrix";

interface PermissionGateProps {
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = true,
  fallback = null,
  children,
  className,
}: PermissionGateProps) {
  const { hasPermission, hasPermissions, loading } = usePermissions();

  // Show loading state if permissions are still being fetched
  if (loading) {
    return <div className={className}>{fallback}</div>;
  }

  // Determine which permissions to check
  let permissionsToCheck: PermissionKey[] = [];

  if (permission) {
    permissionsToCheck = [permission];
  } else if (permissions) {
    permissionsToCheck = permissions;
  } else {
    console.warn("PermissionGate: No permission or permissions prop provided");
    return <div className={className}>{fallback}</div>;
  }

  // Check permissions
  const hasRequiredPermissions =
    permissionsToCheck.length === 1
      ? hasPermission(permissionsToCheck[0])
      : hasPermissions(permissionsToCheck, requireAll);

  if (!hasRequiredPermissions) {
    return <div className={className}>{fallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Hook version of PermissionGate for conditional rendering
 */
export function usePermissionGate(
  permission?: PermissionKey,
  permissions?: PermissionKey[],
  requireAll: boolean = true
): boolean {
  const { hasPermission, hasPermissions, loading } = usePermissions();

  if (loading) {
    return false;
  }

  if (permission) {
    return hasPermission(permission);
  } else if (permissions) {
    return hasPermissions(permissions, requireAll);
  }

  return false;
}
