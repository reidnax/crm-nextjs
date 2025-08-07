"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useState, useEffect } from "react";

interface Props {
  children: ReactNode;
}

// Production session configuration
const PRODUCTION_SESSION_CONFIG = {
  // Refetch session every 15 minutes (reduced from 30 seconds)
  refetchInterval: 15 * 60, // 15 minutes

  // Refetch when window regains focus (but with throttling)
  refetchOnWindowFocus: true,

  // Don't refetch when offline
  refetchWhenOffline: false,
};

export default function NextAuthSessionProvider({ children }: Props) {
  const [lastFocus, setLastFocus] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(true);

  // Throttle focus-based refetching to prevent spam
  const shouldRefetchOnFocus = () => {
    const now = Date.now();
    const timeSinceLastFocus = now - lastFocus;

    // Only refetch if more than 5 minutes have passed since last focus
    if (timeSinceLastFocus > 5 * 60 * 1000) {
      setLastFocus(now);
      return true;
    }
    return false;
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SessionProvider
      refetchInterval={PRODUCTION_SESSION_CONFIG.refetchInterval}
      refetchOnWindowFocus={shouldRefetchOnFocus}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
