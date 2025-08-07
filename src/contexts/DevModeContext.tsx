"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useSession } from "next-auth/react";

interface DevUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  department: string | null;
  jobTitle: string | null;
  avatar: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface DevModeContextType {
  isDevMode: boolean;
  selectedUser: DevUser | null;
  availableUsers: DevUser[];
  usersByRole: Record<string, DevUser[]>;
  setSelectedUser: (user: DevUser | null) => void;
  toggleDevMode: () => void;
  canUseDevMode: boolean | null; // null means loading
  getEffectiveUser: () => DevUser | null;
  loading: boolean;
  refreshUsers: () => Promise<void>;
  isSessionLoading: boolean;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const [isDevMode, setIsDevMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DevUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<DevUser[]>([]);
  const [usersByRole, setUsersByRole] = useState<Record<string, DevUser[]>>({});
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Only Admin-Dev can use dev mode (but don't hide during loading)
  // Check both current role and real user role for impersonation support
  const userRole = (session?.user as any)?.role;
  const realUserRole = (session?.user as any)?.realUserRole;
  const canUseDevMode =
    status === "loading"
      ? null
      : userRole === "Admin-Dev" || realUserRole === "Admin-Dev";
  const isSessionLoading = status === "loading";

  // Check if we're currently impersonating based on session
  const isImpersonated = (session?.user as any)?.isImpersonated;
  const impersonatedUserId = isImpersonated ? (session?.user as any)?.id : null;

  const fetchUsers = async () => {
    if (canUseDevMode !== true) return;

    setLoading(true);
    try {
      const response = await fetch("/api/dev/users");
      const result = await response.json();

      if (result.success) {
        setAvailableUsers(result.data.users);
        setUsersByRole(result.data.usersByRole);
      } else {
        console.error("Failed to fetch users for dev mode:", result.message);
      }
    } catch (error) {
      console.error("Error fetching users for dev mode:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  const toggleDevMode = () => {
    if (canUseDevMode !== true) return; // Don't allow toggle if loading or not authorized

    setIsDevMode((prev) => {
      const newDevMode = !prev;
      if (!newDevMode) {
        // Reset selected user when exiting dev mode
        setSelectedUser(null);
        // Clear server-side session override
        handleSetSelectedUser(null);
      }
      return newDevMode;
    });
  };

  const handleSetSelectedUser = async (user: DevUser | null) => {
    if (canUseDevMode !== true || !isDevMode) return;

    setSelectedUser(user);

    // Register user choice with server for session override
    try {
      // Get the real admin user ID (if already impersonating, use realUserId, otherwise use current id)
      const realAdminUserId = (session?.user as any)?.isImpersonated
        ? (session?.user as any)?.realUserId
        : (session?.user as any)?.id;

      const response = await fetch("/api/dev/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || null,
          realUserId: realAdminUserId,
        }),
      });

      if (response.ok) {
        // Update the selected user immediately in client state
        setSelectedUser(user);

        // Only turn off dev mode if explicitly stopping impersonation (user is null)
        // Keep dev mode on when switching between users
        if (!user) {
          setIsDevMode(false);
        }

        // Force NextAuth to refresh the session from the server
        try {
          await update();

          // Give a moment for the session to propagate, then check if we need a full reload
          setTimeout(async () => {
            try {
              // Try to fetch the current session to verify it's updated
              const sessionCheckResponse = await fetch("/api/auth/session");
              if (sessionCheckResponse.ok) {
                const updatedSession = await sessionCheckResponse.json();

                // If the session doesn't reflect our impersonation, do a full reload
                if (user && !updatedSession?.user?.isImpersonated) {
                  window.location.reload();
                } else if (!user && updatedSession?.user?.isImpersonated) {
                  window.location.reload();
                }
                // If session is correctly updated, the components should re-render automatically
              } else {
                // If session check fails, do a full reload as fallback
                window.location.reload();
              }
            } catch (error) {
              console.error(
                "Session check failed, falling back to reload:",
                error
              );
              window.location.reload();
            }
          }, 200);
        } catch (updateError) {
          console.error("Session update failed:", updateError);
          // Fallback to page reload if session update fails
          window.location.reload();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Failed to register user impersonation with server:",
          errorData.error || "Unknown error"
        );
      }
    } catch (error) {
      console.error(
        "Failed to register user impersonation with server:",
        error
      );
    }
  };

  // Initialize dev mode state based on session impersonation status
  useEffect(() => {
    const initializeDevMode = async () => {
      if (session && canUseDevMode === true && !isInitialized) {
        try {
          // Check impersonation status from API
          const response = await fetch("/api/dev/impersonation-status");
          const result = await response.json();

          if (result.success && result.data.isImpersonating) {
            // We're currently impersonating someone
            setIsDevMode(true);

            // Set the impersonated user directly from the API response
            const impersonatedUser = result.data.impersonatedUser;
            setSelectedUser(impersonatedUser);

            // Ensure users are loaded for the dropdown
            if (availableUsers.length === 0) {
              await fetchUsers();
            }
          } else {
            // Not impersonating
            setIsDevMode(false);
            setSelectedUser(null);
          }
        } catch (error) {
          console.error("Failed to check impersonation status:", error);
          // Fallback to session-based detection
          if (isImpersonated && impersonatedUserId) {
            setIsDevMode(true);
          } else {
            setIsDevMode(false);
            setSelectedUser(null);
          }
        }
        setIsInitialized(true);
      }
    };

    initializeDevMode();
  }, [session, canUseDevMode, isInitialized]);

  // Fetch users when dev mode is enabled
  useEffect(() => {
    if (isDevMode && canUseDevMode === true && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [isDevMode, canUseDevMode]);

  const getEffectiveUser = (): DevUser | null => {
    if (isDevMode && selectedUser) {
      return selectedUser;
    }
    return null;
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevMode,
        selectedUser,
        availableUsers,
        usersByRole,
        setSelectedUser: handleSetSelectedUser,
        toggleDevMode,
        canUseDevMode,
        getEffectiveUser,
        loading,
        refreshUsers,
        isSessionLoading,
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

export const AVAILABLE_ROLES = ["Admin", "Admin-Dev", "Manager", "Assignee"];
