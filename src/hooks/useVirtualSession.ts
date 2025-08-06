"use client";

import { useSession } from "next-auth/react";
import { useDevMode } from "@/contexts/DevModeContext";

/**
 * Enhanced session hook that returns virtual user when in dev mode
 * This provides seamless switching between real and virtual users
 */
export function useVirtualSession() {
  const { data: realSession, status, update } = useSession();
  const { isDevMode, virtualUser, getEffectiveUser } = useDevMode();

  // Return virtual session when in dev mode
  if (isDevMode && virtualUser && realSession?.user?.role === "Admin-Dev") {
    const virtualSession = {
      ...realSession,
      user: {
        ...realSession.user,
        id: virtualUser.id.toString(),
        name: virtualUser.name,
        email: virtualUser.email,
        role: virtualUser.role,
        department: virtualUser.department,
        isVirtual: true,
      },
    };

    return {
      data: virtualSession,
      status,
      update,
      isVirtual: true,
      realUser: realSession.user,
      virtualUser,
    };
  }

  // Return real session when not in dev mode
  return {
    data: realSession,
    status,
    update,
    isVirtual: false,
    realUser: realSession?.user || null,
    virtualUser: null,
  };
}

/**
 * Get effective user ID for API calls
 */
export function useEffectiveUserId(): number | null {
  const session = useVirtualSession();

  if (!session.data?.user?.id) {
    return null;
  }

  return parseInt(session.data.user.id);
}

/**
 * Get effective user role for permission checks
 */
export function useEffectiveUserRole(): string | null {
  const session = useVirtualSession();
  return session.data?.user?.role || null;
}
