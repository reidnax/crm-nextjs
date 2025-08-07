"use client";

import { useSession } from "next-auth/react";
import { useDevMode } from "@/contexts/DevModeContext";

/**
 * Enhanced session hook that returns impersonated user when in dev mode
 * This provides seamless switching between real and impersonated users
 */
interface ExtendedUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  isImpersonated?: boolean;
  realUserId?: string;
  realUserRole?: string;
}

export function useVirtualSession() {
  const { data: session, status, update } = useSession();
  const { selectedUser } = useDevMode();

  // Check if we're currently impersonating a user
  const user = session?.user as ExtendedUser;
  const isImpersonated = user?.isImpersonated || false;
  const realUserId = user?.realUserId || null;

  return {
    data: session,
    status,
    update,
    isImpersonated,
    impersonatedUser: isImpersonated ? session?.user : null,
    realUserId,
    selectedUser,
  };
}

/**
 * Get effective user ID for API calls
 */
export function useEffectiveUserId(): number | null {
  const session = useVirtualSession();
  const user = session.data?.user as ExtendedUser;

  if (!user?.id) {
    return null;
  }

  return parseInt(user.id);
}

/**
 * Get effective user role for permission checks
 */
export function useEffectiveUserRole(): string | null {
  const session = useVirtualSession();
  const user = session.data?.user as ExtendedUser;
  return user?.role || null;
}
