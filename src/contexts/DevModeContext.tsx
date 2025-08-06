"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  VIRTUAL_TEST_USERS,
  VirtualUser,
  VirtualDataAssigner,
} from "@/lib/virtual-users";

interface DevModeContextType {
  isDevMode: boolean;
  simulatedRole: string | null;
  virtualUser: VirtualUser | null;
  setSimulatedRole: (role: string | null) => void;
  toggleDevMode: () => void;
  canUseDevMode: boolean;
  getEffectiveUser: () => VirtualUser | null;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

const AVAILABLE_ROLES = ["Admin", "Admin-Dev", "Manager", "Assignee"];

export function DevModeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [isDevMode, setIsDevMode] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
  const [virtualUser, setVirtualUser] = useState<VirtualUser | null>(null);

  // Only Admin-Dev can use dev mode
  const canUseDevMode = session?.user?.role === "Admin-Dev";

  const toggleDevMode = () => {
    if (!canUseDevMode) return;

    setIsDevMode((prev) => {
      const newDevMode = !prev;
      if (!newDevMode) {
        // Reset simulated role when exiting dev mode
        setSimulatedRole(null);
      }
      return newDevMode;
    });
  };

  const handleSetSimulatedRole = async (role: string | null) => {
    if (!canUseDevMode || !isDevMode) return;

    setSimulatedRole(role);

    if (role) {
      // Set virtual user based on role
      const vUser = Object.values(VIRTUAL_TEST_USERS).find(
        (u) => u.role === role
      );
      setVirtualUser(vUser || null);

      // Register virtual user choice with server
      try {
        const response = await fetch("/api/dev/virtual-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ virtualUserRole: role }),
        });

        if (response.ok) {
          console.log(`Virtual user ${role} registered with server`);
        }
      } catch (error) {
        console.error("Failed to register virtual user with server:", error);
      }

      // Clear previous data assignments
      VirtualDataAssigner.clearAssignments();
    } else {
      setVirtualUser(null);

      // Unregister virtual user choice with server
      try {
        const response = await fetch("/api/dev/virtual-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ virtualUserRole: null }),
        });

        if (response.ok) {
          console.log("Virtual user unregistered from server");
        }
      } catch (error) {
        console.error("Failed to unregister virtual user from server:", error);
      }

      VirtualDataAssigner.clearAssignments();
    }
  };

  const getEffectiveUser = (): VirtualUser | null => {
    if (isDevMode && virtualUser) {
      return virtualUser;
    }
    return null;
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevMode,
        simulatedRole,
        virtualUser,
        setSimulatedRole: handleSetSimulatedRole,
        toggleDevMode,
        canUseDevMode,
        getEffectiveUser,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error("useDevMode must be used within a DevModeProvider");
  }
  return context;
}

export { AVAILABLE_ROLES };
