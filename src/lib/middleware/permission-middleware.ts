/**
 * Permission Middleware for API Routes
 * Provides decorators and utilities for protecting API endpoints
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PermissionManager, PermissionContext } from "../permissions/core";
import { PermissionKey } from "../permissions/permission-matrix";
import { AuditService } from "../permissions/audit-service";
import { errorResponse } from "@/lib/api-response";

export interface PermissionMiddlewareOptions {
  permissions: PermissionKey[];
  requireAll?: boolean;
  context?: Partial<PermissionContext>;
  auditAction?: string;
}

export interface ResourceMiddlewareOptions {
  resourceType: string;
  getResourceId?: (req: NextRequest, params: any) => number;
  auditAction?: string;
}

/**
 * Get user information from request session
 */
async function getUserFromSession(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return null;
    }

    return {
      id: parseInt(session.user.id),
      role: (session.user as any).role,
      email: session.user.email,
    };
  } catch (error) {
    console.error("Error getting user from session:", error);
    return null;
  }
}

/**
 * Extract client information from request
 */
function getClientInfo(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0]
    : req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Permission middleware decorator for API routes
 */
export function withPermissions(options: PermissionMiddlewareOptions) {
  return function <T extends Function>(handler: T): T {
    const wrappedHandler = async (req: NextRequest, context: any) => {
      try {
        // Get user from session
        const user = await getUserFromSession(req);
        if (!user) {
          return errorResponse("Authentication required", 401);
        }

        // Build permission context
        const permissionContext: PermissionContext = {
          userId: user.id,
          ...options.context,
        };

        // Add route parameters to context if available
        if (context?.params?.id) {
          permissionContext.resourceId = parseInt(context.params.id);
        }

        // Check permissions
        const hasPermission = await PermissionManager.hasPermissions(
          user.id,
          options.permissions,
          options.requireAll ?? true,
          permissionContext
        );

        if (!hasPermission) {
          // Log failed access attempt
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: options.context?.resourceType || "api",
            resourceId: permissionContext.resourceId || 0,
            action: options.auditAction || req.method,
            success: false,
            ipAddress,
            userAgent,
            errorMessage: `Insufficient permissions: ${options.permissions.join(
              ", "
            )}`,
          });

          return errorResponse("Insufficient permissions", 403);
        }

        // Log successful access
        if (options.auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: options.context?.resourceType || "api",
            resourceId: permissionContext.resourceId || 0,
            action: options.auditAction,
            success: true,
            ipAddress,
            userAgent,
          });
        }

        // Add user and context to request for handler use
        (req as any).user = user;
        (req as any).permissionContext = permissionContext;

        // Call original handler
        return await handler(req, context);
      } catch (error) {
        console.error("Permission middleware error:", error);
        return errorResponse("Internal server error", 500);
      }
    };

    return wrappedHandler as T;
  };
}

/**
 * Resource ownership middleware decorator
 */
export function withResourceOwnership(options: ResourceMiddlewareOptions) {
  return function <T extends Function>(handler: T): T {
    const wrappedHandler = async (req: NextRequest, context: any) => {
      try {
        // Get user from session
        const user = await getUserFromSession(req);
        if (!user) {
          return errorResponse("Authentication required", 401);
        }

        // Get resource ID
        const resourceId = options.getResourceId
          ? options.getResourceId(req, context.params)
          : parseInt(context.params?.id);

        if (!resourceId) {
          return errorResponse("Resource ID required", 400);
        }

        // Check ownership or admin permissions
        const isOwner = await PermissionManager.isOwner(
          user.id,
          options.resourceType,
          resourceId
        );
        const hasAdminPermission = await PermissionManager.hasPermission(
          user.id,
          `${options.resourceType}.update.all` as PermissionKey
        );

        if (!isOwner && !hasAdminPermission) {
          // Log failed access attempt
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: options.resourceType,
            resourceId,
            action: options.auditAction || req.method,
            success: false,
            ipAddress,
            userAgent,
            errorMessage:
              "Resource access denied - not owner and insufficient permissions",
          });

          return errorResponse("Resource access denied", 403);
        }

        // Log successful access
        if (options.auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: options.resourceType,
            resourceId,
            action: options.auditAction,
            success: true,
            ipAddress,
            userAgent,
          });
        }

        // Add user and resource info to request
        (req as any).user = user;
        (req as any).resourceInfo = {
          type: options.resourceType,
          id: resourceId,
          isOwner,
          hasAdminPermission,
        };

        // Call original handler
        return await handler(req, context);
      } catch (error) {
        console.error("Resource ownership middleware error:", error);
        return errorResponse("Internal server error", 500);
      }
    };

    return wrappedHandler as T;
  };
}

/**
 * Role-based middleware decorator (simplified for common use cases)
 */
export function withRoles(allowedRoles: string[], auditAction?: string) {
  return function <T extends Function>(handler: T): T {
    const wrappedHandler = async (req: NextRequest, context: any) => {
      try {
        // Get user from session
        const user = await getUserFromSession(req);
        if (!user) {
          return errorResponse("Authentication required", 401);
        }

        // Check role
        if (!allowedRoles.includes(user.role || "")) {
          // Log failed access attempt
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: "api",
            resourceId: 0,
            action: auditAction || req.method,
            success: false,
            ipAddress,
            userAgent,
            errorMessage: `Role access denied. Required: ${allowedRoles.join(
              ", "
            )}, Has: ${user.role}`,
          });

          return errorResponse("Insufficient role permissions", 403);
        }

        // Log successful access
        if (auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: "api",
            resourceId: 0,
            action: auditAction,
            success: true,
            ipAddress,
            userAgent,
          });
        }

        // Add user to request
        (req as any).user = user;

        // Call original handler
        return await handler(req, context);
      } catch (error) {
        console.error("Role middleware error:", error);
        return errorResponse("Internal server error", 500);
      }
    };

    return wrappedHandler as T;
  };
}

/**
 * Authentication only middleware (no permission checks)
 */
export function withAuth(auditAction?: string) {
  return function <T extends Function>(handler: T): T {
    const wrappedHandler = async (req: NextRequest, context: any) => {
      try {
        // Get user from session
        const user = await getUserFromSession(req);
        if (!user) {
          return errorResponse("Authentication required", 401);
        }

        // Log access
        if (auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          await AuditService.logResourceAccess({
            userId: user.id,
            resourceType: "api",
            resourceId: 0,
            action: auditAction,
            success: true,
            ipAddress,
            userAgent,
          });
        }

        // Add user to request
        (req as any).user = user;

        // Call original handler
        return await handler(req, context);
      } catch (error) {
        console.error("Auth middleware error:", error);
        return errorResponse("Internal server error", 500);
      }
    };

    return wrappedHandler as T;
  };
}

/**
 * Utility function to check permissions in handler (for complex logic)
 */
export async function checkPermission(
  req: NextRequest,
  permission: PermissionKey,
  context?: PermissionContext
): Promise<boolean> {
  const user = (req as any).user;
  if (!user) return false;

  return await PermissionManager.hasPermission(user.id, permission, context);
}

/**
 * Utility function to get current user from middleware-processed request
 */
export function getCurrentUser(req: NextRequest) {
  return (req as any).user || null;
}

/**
 * Utility function to get resource info from middleware-processed request
 */
export function getResourceInfo(req: NextRequest) {
  return (req as any).resourceInfo || null;
}
