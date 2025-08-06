"use client";

/**
 * Resource Gate Component
 * Controls access to UI elements based on resource ownership and permissions
 */

import React, { useEffect, useState } from "react";
import { usePermissions } from "@/contexts/PermissionContext";
import { PermissionKey } from "@/lib/permissions/permission-matrix";

interface ResourceGateProps {
  resourceType: string;
  resourceId: number;
  action: string; // 'read', 'update', 'delete', etc.
  ownershipRequired?: boolean; // If true, requires ownership OR admin permission
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ResourceGate({
  resourceType,
  resourceId,
  action,
  ownershipRequired = false,
  fallback = null,
  children,
  className,
}: ResourceGateProps) {
  const {
    hasPermission,
    isOwner,
    loading: permissionsLoading,
  } = usePermissions();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (permissionsLoading) return;

      setLoading(true);

      try {
        // Build permission name based on resource type and action
        const globalPermission =
          `${resourceType}.${action}.all` as PermissionKey;
        const assignedPermission =
          `${resourceType}.${action}.assigned` as PermissionKey;
        const departmentPermission =
          `${resourceType}.${action}.department` as PermissionKey;

        // Check if user has global permission
        if (hasPermission(globalPermission)) {
          setCanAccess(true);
          setLoading(false);
          return;
        }

        // If ownership is required, check ownership + assigned permission
        if (ownershipRequired) {
          const isResourceOwner = await isOwner(resourceType, resourceId);

          if (isResourceOwner && hasPermission(assignedPermission)) {
            setCanAccess(true);
            setLoading(false);
            return;
          }

          // Check department permission for managers
          if (hasPermission(departmentPermission)) {
            // In a real implementation, we'd verify the resource belongs to user's department
            setCanAccess(true);
            setLoading(false);
            return;
          }
        }

        // No access
        setCanAccess(false);
      } catch (error) {
        console.error("Error checking resource access:", error);
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (resourceId) {
      checkAccess();
    } else {
      setCanAccess(false);
      setLoading(false);
    }
  }, [
    resourceType,
    resourceId,
    action,
    ownershipRequired,
    hasPermission,
    isOwner,
    permissionsLoading,
  ]);

  // Show loading state
  if (loading || permissionsLoading) {
    return <div className={className}>{fallback}</div>;
  }

  // Check access
  if (!canAccess) {
    return <div className={className}>{fallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Hook version of ResourceGate for conditional rendering
 */
export function useResourceGate(
  resourceType: string,
  resourceId: number,
  action: string,
  ownershipRequired: boolean = false
) {
  const {
    hasPermission,
    isOwner,
    loading: permissionsLoading,
  } = usePermissions();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (permissionsLoading) return;

      setLoading(true);

      try {
        // Build permission name based on resource type and action
        const globalPermission =
          `${resourceType}.${action}.all` as PermissionKey;
        const assignedPermission =
          `${resourceType}.${action}.assigned` as PermissionKey;
        const departmentPermission =
          `${resourceType}.${action}.department` as PermissionKey;

        // Check if user has global permission
        if (hasPermission(globalPermission)) {
          setCanAccess(true);
          setLoading(false);
          return;
        }

        // If ownership is required, check ownership + assigned permission
        if (ownershipRequired) {
          const isResourceOwner = await isOwner(resourceType, resourceId);

          if (isResourceOwner && hasPermission(assignedPermission)) {
            setCanAccess(true);
            setLoading(false);
            return;
          }

          // Check department permission for managers
          if (hasPermission(departmentPermission)) {
            setCanAccess(true);
            setLoading(false);
            return;
          }
        }

        // No access
        setCanAccess(false);
      } catch (error) {
        console.error("Error checking resource access:", error);
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (resourceId) {
      checkAccess();
    } else {
      setCanAccess(false);
      setLoading(false);
    }
  }, [
    resourceType,
    resourceId,
    action,
    ownershipRequired,
    hasPermission,
    isOwner,
    permissionsLoading,
  ]);

  return { canAccess, loading };
}
