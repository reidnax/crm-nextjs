"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function NextAuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider
      refetchInterval={30} // Refetch session every 30 seconds during auth issues
      refetchOnWindowFocus={true} // Refetch when window regains focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </SessionProvider>
  );
}
