"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Hook to watch for session changes and trigger re-renders
 * This is useful for components that need to react to impersonation changes
 */
export function useSessionWatcher() {
  const { data: session, status, update } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isImpersonated, setIsImpersonated] = useState<boolean>(false);

  useEffect(() => {
    if (session?.user) {
      const currentSessionId = (session.user as any)?.id;
      const currentIsImpersonated =
        (session.user as any)?.isImpersonated || false;

      // Check if the session has actually changed
      if (
        sessionId !== currentSessionId ||
        isImpersonated !== currentIsImpersonated
      ) {
        setSessionId(currentSessionId);
        setIsImpersonated(currentIsImpersonated);
      }
    }
  }, [session, sessionId, isImpersonated]);

  // Force a session refresh
  const refreshSession = async () => {
    try {
      await update();
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  };

  return {
    session,
    status,
    refreshSession,
    sessionId,
    isImpersonated,
  };
}
