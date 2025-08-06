/**
 * Server-side Virtual Session Handler
 * Automatically detects and applies virtual user context for Admin-Dev users
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Enhanced getServerSession that automatically handles virtual users
 * Checks session storage or request context for virtual user information
 */
export async function getVirtualAwareServerSession(request?: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return session;
  }

  // Only Admin-Dev users can use virtual mode
  if (session.user.role !== "Admin-Dev") {
    return session;
  }

  // Check if there's virtual user context in headers (if implemented)
  // For now, we'll implement a different approach using local storage simulation

  return session;
}

/**
 * Get effective user ID considering virtual context
 */
export function getEffectiveUserId(
  session: any,
  request?: NextRequest
): number {
  if (!session?.user?.id) {
    throw new Error("No valid session");
  }

  const realUserId = parseInt(session.user.id);

  // Check for virtual mode indicators
  // Since we can't access frontend state directly, we'll use a different approach

  return realUserId;
}

/**
 * Alternative approach: Use a global virtual user registry
 * Admin-Dev users can "register" their virtual user choice server-side
 */

// Global registry for Admin-Dev virtual user choices (in-memory for development)
const virtualUserRegistry = new Map<
  number,
  {
    virtualUserId: number;
    virtualUserRole: string;
    timestamp: number;
  }
>();

/**
 * Register virtual user choice for an Admin-Dev user
 */
export function registerVirtualUser(
  realUserId: number,
  virtualUserId: number,
  virtualUserRole: string
) {
  virtualUserRegistry.set(realUserId, {
    virtualUserId,
    virtualUserRole,
    timestamp: Date.now(),
  });
}

/**
 * Unregister virtual user choice
 */
export function unregisterVirtualUser(realUserId: number) {
  virtualUserRegistry.delete(realUserId);
}

/**
 * Get virtual user choice for an Admin-Dev user
 */
export function getVirtualUserChoice(realUserId: number) {
  const choice = virtualUserRegistry.get(realUserId);

  // Clean up old entries (older than 1 hour)
  if (choice && Date.now() - choice.timestamp > 3600000) {
    virtualUserRegistry.delete(realUserId);
    return null;
  }

  return choice;
}

/**
 * Enhanced permission check that considers virtual user context
 */
export async function getEffectiveUserForPermissions(session: any): Promise<{
  userId: number;
  userRole: string;
  isVirtual: boolean;
}> {
  if (!session?.user?.id) {
    throw new Error("No valid session");
  }

  const realUserId = parseInt(session.user.id);
  const realUserRole = session.user.role;

  // Check if Admin-Dev has registered a virtual user choice
  if (realUserRole === "Admin-Dev") {
    const virtualChoice = getVirtualUserChoice(realUserId);
    if (virtualChoice) {
      return {
        userId: virtualChoice.virtualUserId,
        userRole: virtualChoice.virtualUserRole,
        isVirtual: true,
      };
    }
  }

  return {
    userId: realUserId,
    userRole: realUserRole,
    isVirtual: false,
  };
}
