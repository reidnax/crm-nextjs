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
  useRef,
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
  error: string | null;
  retryCount: number;
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
  clearError: () => void;
}

interface PermissionCheckContext {
  resourceType?: string;
  resourceId?: number;
  targetUserId?: number;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

// Production configuration for performance optimization
const PRODUCTION_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1 second
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  DEBOUNCE_DELAY: 300, // 300ms
};

// Cache for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = PRODUCTION_CONFIG.CACHE_DURATION): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new ApiCache();

// Auto-cleanup cache every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => apiCache.clearExpired(), 5 * 60 * 1000);
}

/**
 * Production-Enhanced Permission Provider Component
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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for debouncing and preventing duplicate requests
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializingRef = useRef(false);

  /**
   * Enhanced fetch with retry logic and exponential backoff
   */
  const fetchWithRetry = useCallback(
    async <T>(
      url: string,
      options: RequestInit = {},
      retries: number = PRODUCTION_CONFIG.MAX_RETRY_ATTEMPTS
    ): Promise<T> => {
      const cacheKey = `${url}-${JSON.stringify(options)}`;
      
      // Check cache first
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (response.status === 401) {
            // Clear cache on auth failure
            apiCache.clear();
            throw new Error('Authentication required');
          }

          if (response.status === 403) {
            throw new Error('Access forbidden');
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Cache successful responses
          apiCache.set(cacheKey, data);
          
          return data;
        } catch (error) {
          const isLastAttempt = attempt === retries;
          
          if (isLastAttempt) {
            throw error;
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = PRODUCTION_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new Error('Max retries exceeded');
    },
    []
  );

  /**
   * Fetch user permissions with enhanced error handling
   */
  const fetchPermissions = useCallback(async (): Promise<PermissionKey[]> => {
    if (!realSession?.user) {
      return [];
    }

    try {
      const data = await fetchWithRetry<{ data?: { permissions: PermissionKey[] } }>(
        "/api/permissions/user"
      );
      return data.data?.permissions || [];
    } catch (error) {
      console.error("Error fetching permissions:", error);
      
      // Return cached permissions if available
      const cached = apiCache.get<PermissionKey[]>('permissions-fallback');
      if (cached) {
        console.warn("Using cached permissions due to fetch error");
        return cached;
      }
      
      return [];
    }
  }, [realSession?.user, fetchWithRetry]);

  /**
   * Fetch user details with enhanced error handling
   */
  const fetchUserDetails = useCallback(async (): Promise<User | null> => {
    if (!realSession?.user) {
      return null;
    }

    try {
      const data = await fetchWithRetry<{ data?: { user: User } }>(
        "/api/permissions/user-details"
      );
      return data.data?.user || null;
    } catch (error) {
      console.error("Error fetching user details:", error);
      
      // Return cached user if available
      const cached = apiCache.get<User>('user-fallback');
      if (cached) {
        console.warn("Using cached user details due to fetch error");
        return cached;
      }
      
      return null;
    }
  }, [realSession?.user, fetchWithRetry]);

  /**
   * Debounced initialization to prevent rapid re-initialization
   */
  const debouncedInitialize = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      if (isInitializingRef.current) return;
      
      isInitializingRef.current = true;
      setLoading(true);
      setError(null);

      if (status === "loading") {
        isInitializingRef.current = false;
        return;
      }

      if (!realSession?.user) {
        setUser(null);
        setPermissions([]);
        setLoading(false);
        isInitializingRef.current = false;
        return;
      }

      try {
        const [userDetailsResult, userPermissionsResult] = await Promise.allSettled([
          fetchUserDetails(),
          fetchPermissions(),
        ]);

        let hasError = false;

        // Handle user details
        if (userDetailsResult.status === "fulfilled") {
          const userData = userDetailsResult.value;
          setUser(userData);
          
          // Cache for fallback
          if (userData) {
            apiCache.set('user-fallback', userData, 30 * 60 * 1000); // 30 min cache
          }
        } else {
          console.error("Error fetching user details:", userDetailsResult.reason);
          hasError = true;
        }

        // Handle permissions
        if (userPermissionsResult.status === "fulfilled") {
          const permissionsData = userPermissionsResult.value;
          setPermissions(permissionsData);
          
          // Cache for fallback
          if (permissionsData.length > 0) {
            apiCache.set('permissions-fallback', permissionsData, 30 * 60 * 1000); // 30 min cache
          }
        } else {
          console.error("Error fetching permissions:", userPermissionsResult.reason);
          hasError = true;
        }

        if (hasError) {
          setError("Some data could not be loaded. Using cached data where available.");
          setRetryCount(prev => prev + 1);
        } else {
          setError(null);
          setRetryCount(0);
        }
      } catch (error) {
        console.error("Error initializing permissions:", error);
        setError(error instanceof Error ? error.message : "Failed to load permissions");
        setUser(null);
        setPermissions([]);
        setRetryCount(prev => prev + 1);
      } finally {
        setLoading(false);
        isInitializingRef.current = false;
      }
    }, PRODUCTION_CONFIG.DEBOUNCE_DELAY);
  }, [realSession, status, isDevMode, fetchUserDetails, fetchPermissions]);

  /**
   * Initialize permissions when session changes
   */
  useEffect(() => {
    debouncedInitialize();
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [debouncedInitialize]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

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
   * Check resource ownership with caching
   */
  const isOwner = useCallback(
    async (resourceType: string, resourceId: number): Promise<boolean> => {
      try {
        if (!user?.id) {
          return false;
        }

        const cacheKey = `ownership:${resourceType}:${resourceId}:${user.id}`;
        const cached = apiCache.get<boolean>(cacheKey);
        if (cached !== null) {
          return cached;
        }

        const response = await fetchWithRetry<{ isOwner: boolean }>(
          `/api/permissions/ownership?resourceType=${resourceType}&resourceId=${resourceId}`
        );

        const result = response.isOwner || false;
        apiCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minute cache
        
        return result;
      } catch (error) {
        console.error("Error checking ownership:", error);
        return false;
      }
    },
    [user?.id, fetchWithRetry]
  );

  /**
   * Check if user can access a resource with caching
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

        const cacheKey = `access:${resourceType}:${resourceId}:${action}:${user.id}`;
        const cached = apiCache.get<boolean>(cacheKey);
        if (cached !== null) {
          return cached;
        }

        const response = await fetchWithRetry<{ canAccess: boolean }>(
          `/api/permissions/resource-access?resourceType=${resourceType}&resourceId=${resourceId}&action=${action}`
        );

        const result = response.canAccess || false;
        apiCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minute cache
        
        return result;
      } catch (error) {
        console.error("Error checking resource access:", error);
        return false;
      }
    },
    [user?.id, fetchWithRetry]
  );

  /**
   * Refresh permissions manually
   */
  const refreshPermissions = useCallback(async () => {
    if (!realSession?.user) {
      return;
    }

    // Clear relevant cache entries
    apiCache.clear();
    
    // Re-initialize
    debouncedInitialize();
  }, [realSession?.user, debouncedInitialize]);

  const value: PermissionContextValue = {
    user,
    permissions,
    loading,
    error,
    retryCount,
    hasPermission,
    hasPermissions,
    hasRole,
    isOwner,
    canAccessResource,
    refreshPermissions,
    clearError,
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
