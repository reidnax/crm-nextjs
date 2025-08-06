"use client";

/**
 * Role Gate Component
 * Controls access to UI elements based on user roles
 */

import React from "react";
import { usePermissions } from "@/contexts/PermissionContext";

interface RoleGateProps {
  roles: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function RoleGate({
  roles,
  fallback = null,
  children,
  className,
}: RoleGateProps) {
  const { hasRole, loading } = usePermissions();

  // Show loading state if permissions are still being fetched
  if (loading) {
    return <div className={className}>{fallback}</div>;
  }

  // Check if user has required role(s)
  const hasRequiredRole = hasRole(roles);

  if (!hasRequiredRole) {
    return <div className={className}>{fallback}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Hook version of RoleGate for conditional rendering
 */
export function useRoleGate(roles: string | string[]): boolean {
  const { hasRole, loading } = usePermissions();

  if (loading) {
    return false;
  }

  return hasRole(roles);
}
