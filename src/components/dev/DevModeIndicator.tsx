"use client";

import React from "react";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Settings, Crown, Users, UserCheck } from "lucide-react";

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
  const { isDevMode, simulatedRole } = useDevMode();

  // Only show for Admin-Dev users
  if (session?.user?.role !== "Admin-Dev") {
    return null;
  }

  // Only show when in dev mode with a simulated role
  if (!isDevMode || !simulatedRole) {
    return null;
  }

  const IconComponent = ROLE_ICONS[simulatedRole as keyof typeof ROLE_ICONS];
  const colorClass =
    ROLE_COLORS[simulatedRole as keyof typeof ROLE_COLORS] ||
    "bg-gray-500 text-white";

  return (
    <Badge className={`${colorClass} animate-pulse`}>
      <Settings className="h-3 w-3 mr-1" />
      Dev Mode: {simulatedRole}
      {IconComponent && <IconComponent className="h-3 w-3 ml-1" />}
    </Badge>
  );
}
