"use client";

import React from "react";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Settings, Crown, Users, UserCheck } from "lucide-react";
import { useSessionWatcher } from "@/hooks/useSessionWatcher";

const ROLE_ICONS = {
  Admin: Crown,
  "Admin-Dev": Settings,
  Manager: Users,
  Assignee: UserCheck,
};

const ROLE_COLORS = {
  Admin: "bg-purple-500 text-white",
  "Admin-Dev": "bg-blue-500 text-white",
  Manager: "bg-green-500 text-white",
  Assignee: "bg-gray-500 text-white",
};

export function DevModeIndicator() {
  const { data: session } = useSession();
  const { session: watchedSession } = useSessionWatcher();
  const { isDevMode, selectedUser } = useDevMode();

  // Use the watched session if available, fallback to regular session
  const currentSession = watchedSession || session;

  // Only show for Admin-Dev users (check both current role and real user role)
  const userRole = (currentSession?.user as any)?.role;
  const realUserRole = (currentSession?.user as any)?.realUserRole;
  const isAdminDev = userRole === "Admin-Dev" || realUserRole === "Admin-Dev";

  if (!isAdminDev) {
    return null;
  }

  // Only show when in dev mode and impersonating
  const isImpersonated = (currentSession?.user as any)?.isImpersonated;
  if (!isDevMode || !isImpersonated || !selectedUser) {
    return null;
  }

  const currentRole = userRole; // This is now the impersonated user's role
  const IconComponent = ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS];
  const colorClass =
    ROLE_COLORS[currentRole as keyof typeof ROLE_COLORS] ||
    "bg-gray-500 text-white";

  return (
    <Badge className={`${colorClass} animate-pulse`}>
      <Settings className="h-3 w-3 mr-1" />
      Impersonating: {currentRole}
      {IconComponent && <IconComponent className="h-3 w-3 ml-1" />}
    </Badge>
  );
}
