"use client";

/**
 * Permission Context for Frontend Permission Management
 * Provides permission checking capabilities to React components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { PermissionKey } from "@/lib/permissions/permission-matrix";
import { useDevMode } from "@/contexts/DevModeContext";

interface User {
  id: number;
  role?: string | null;
  department?: string | null;
  managerId?: number | null;
}

interface PermissionContextValue {
  user: User | null;
  permissions: PermissionKey[];
  loading: boolean;
  hasPermission: (
    permission: PermissionKey,
    context?: PermissionCheckContext
  ) => boolean;
  hasPermissions: (
    permissions: PermissionKey[],
    requireAll?: boolean
  ) => boolean;
  hasRole: (roles: string | string[]) => boolean;
  isOwner: (resourceType: string, resourceId: number) => Promise<boolean>;
  canAccessResource: (
    resourceType: string,
    resourceId: number,
    action: string
  ) => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

interface PermissionCheckContext {
  resourceType?: string;
  resourceId?: number;
  targetUserId?: number;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

/**
 * Permission Provider Component
 */
export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: realSession, status } = useSession();
  const { isDevMode } = useDevMode();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user permissions from API
   */
  const fetchPermissions = useCallback(async (): Promise<PermissionKey[]> => {
    try {
      // Fetch user permissions from API
      if (!realSession?.user) {
        return [];
      }

      const response = await fetch("/api/permissions/user");
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      return data.data?.permissions || [];
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }
  }, [realSession?.user]);

  /**
   * Fetch user details
   */
  const fetchUserDetails = useCallback(async (): Promise<User | null> => {
    try {
      // Fetch user details from API
      if (!realSession?.user) {
        return null;
      }

      const response = await fetch("/api/permissions/user-details");
      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = await response.json();
      return data.data?.user || null;
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  }, [realSession?.user]);

  /**
   * Initialize permissions when session is available
   */
  useEffect(() => {
    const initializePermissions = async () => {
      setLoading(true);

      if (status === "loading") {
        return;
      }

      // For impersonated users, we don't need a real session
      if (!realSession?.user) {
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const [userDetails, userPermissions] = await Promise.all([
          fetchUserDetails(),
          fetchPermissions(),
        ]);

        setUser(userDetails);
        setPermissions(userPermissions);
      } catch (error) {
        console.error("Error initializing permissions:", error);
        setUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    initializePermissions();
  }, [realSession, status, isDevMode, fetchUserDetails, fetchPermissions]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: PermissionKey, context?: PermissionCheckContext): boolean => {
      if (!permissions.includes(permission)) {
        return false;
      }

      // For context-specific permissions, we need to make additional checks
      if (context) {
        // Department-based permissions
        if (permission.includes(".department") && context.targetUserId) {
          // This would need server-side verification for security
          // For now, assume permission is valid if user has the base permission
          return true;
        }

        // Assigned/ownership-based permissions
        if (permission.includes(".assigned")) {
          // This would need server-side verification
          // For now, assume permission is valid if user has the base permission
          return true;
        }
      }

      return true;
    },
    [permissions]
  );

  /**
   * Check if user has multiple permissions
   */
  const hasPermissions = useCallback(
    (
      requiredPermissions: PermissionKey[],
      requireAll: boolean = true
    ): boolean => {
      if (requireAll) {
        return requiredPermissions.every((permission) =>
          hasPermission(permission)
        );
      } else {
        return requiredPermissions.some((permission) =>
          hasPermission(permission)
        );
      }
    },
    [hasPermission]
  );

  /**
   * Check if user has specific role(s)
   */
  const hasRole = useCallback(
    (roles: string | string[]): boolean => {
      if (!user?.role) {
        return false;
      }

      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.some(
        (role) => user.role?.toLowerCase() === role.toLowerCase()
      );
    },
    [user?.role]
  );

  /**
   * Check resource ownership (requires API call)
   */
  const isOwner = useCallback(
    async (resourceType: string, resourceId: number): Promise<boolean> => {
      try {
        if (!user?.id) {
          return false;
        }

        const response = await fetch(
          `/api/permissions/ownership?resourceType=${resourceType}&resourceId=${resourceId}`
        );

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return data.isOwner || false;
      } catch (error) {
        console.error("Error checking ownership:", error);
        return false;
      }
    },
    [user?.id]
  );

  /**
   * Check if user can access a resource with specific action
   */
  const canAccessResource = useCallback(
    async (
      resourceType: string,
      resourceId: number,
      action: string
    ): Promise<boolean> => {
      try {
        if (!user?.id) {
          return false;
        }

        const response = await fetch(
          `/api/permissions/resource-access?resourceType=${resourceType}&resourceId=${resourceId}&action=${action}`
        );

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return data.canAccess || false;
      } catch (error) {
        console.error("Error checking resource access:", error);
        return false;
      }
    },
    [user?.id]
  );

  /**
   * Refresh permissions (useful after role changes)
   */
  const refreshPermissions = useCallback(async () => {
    // For impersonated users, we don't need a real session
    if (!realSession?.user) {
      return;
    }

    setLoading(true);
    try {
      const [userDetails, userPermissions] = await Promise.all([
        fetchUserDetails(),
        fetchPermissions(),
      ]);

      setUser(userDetails);
      setPermissions(userPermissions);
    } catch (error) {
      console.error("Error refreshing permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [realSession?.user, fetchUserDetails, fetchPermissions]);

  const value: PermissionContextValue = {
    user,
    permissions,
    loading,
    hasPermission,
    hasPermissions,
    hasRole,
    isOwner,
    canAccessResource,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to use permission context
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

/**
 * Hook to check a specific permission
 */
export function useHasPermission(
  permission: PermissionKey,
  context?: PermissionCheckContext
): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission, context);
}

/**
 * Hook to check multiple permissions
 */
export function useHasPermissions(
  permissions: PermissionKey[],
  requireAll: boolean = true
): boolean {
  const { hasPermissions } = usePermissions();
  return hasPermissions(permissions, requireAll);
}

/**
 * Hook to check role
 */
export function useHasRole(roles: string | string[]): boolean {
  const { hasRole } = usePermissions();
  return hasRole(roles);
}

/**
 * Hook to check resource access
 */
export function useCanAccess(
  resourceType: string,
  resourceId: number,
  action: string
) {
  const { canAccessResource } = usePermissions();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);
      const result = await canAccessResource(resourceType, resourceId, action);
      setCanAccess(result);
      setLoading(false);
    };

    if (resourceId) {
      checkAccess();
    } else {
      setCanAccess(false);
      setLoading(false);
    }
  }, [resourceType, resourceId, action, canAccessResource]);

  return { canAccess, loading };
}
