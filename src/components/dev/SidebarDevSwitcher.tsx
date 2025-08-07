"use client";

import React from "react";
import { useDevMode } from "@/contexts/DevModeContext";
import { useVirtualSession } from "@/hooks/useVirtualSession";
import { getVirtualUserRoles } from "@/lib/virtual-users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Crown, Users, UserCheck, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ICONS = {
  Admin: Crown,
  "Admin-Dev": Settings,
  Manager: Users,
  Assignee: UserCheck,
};

const ROLE_COLORS = {
  Admin: "bg-purple-100 text-purple-800 border-purple-200",
  "Admin-Dev": "bg-blue-100 text-blue-800 border-blue-200",
  Manager: "bg-green-100 text-green-800 border-green-200",
  Assignee: "bg-gray-100 text-gray-800 border-gray-200",
};

interface SidebarDevSwitcherProps {
  isCollapsed?: boolean;
}

export function SidebarDevSwitcher({
  isCollapsed = false,
}: SidebarDevSwitcherProps) {
  const virtualSession = useVirtualSession();
  const {
    isDevMode,
    simulatedRole,
    virtualUser,
    setSimulatedRole,
    toggleDevMode,
    canUseDevMode,
  } = useDevMode();

  if (!canUseDevMode) {
    return null;
  }

  const currentRole = (virtualSession.data?.user as { role?: string })?.role;
  const IconComponent =
    ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS] || Settings;

  const isVirtual = virtualSession.isVirtual;

  return (
    <div className="space-y-2 p-2 border-b border-gray-200">
      {/* Dev Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDevMode ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-600" />
          )}
          {!isCollapsed && (
            <span className="text-xs font-medium">
              {isDevMode ? "Dev Mode ON" : "Dev Mode OFF"}
            </span>
          )}
        </div>
        <Switch
          checked={isDevMode}
          onCheckedChange={toggleDevMode}
          className="scale-75"
        />
      </div>

      {/* Current Role Display */}
      {!isCollapsed && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Role:</span>
          <Badge
            className={cn(
              "text-xs",
              ROLE_COLORS[currentRole as keyof typeof ROLE_COLORS] ||
                "bg-gray-100 text-gray-800"
            )}
          >
            <IconComponent className="h-3 w-3 mr-1" />
            {currentRole}
            {isVirtual && <span className="text-xs ml-1">(V)</span>}
          </Badge>
        </div>
      )}

      {/* Role Selector (only visible in dev mode) */}
      {isDevMode && !isCollapsed && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Virtual Role:
          </label>
          <Select
            value={simulatedRole || "reset"}
            onValueChange={(value) =>
              setSimulatedRole(value === "reset" ? null : value)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reset">Use Real User</SelectItem>
              {getVirtualUserRoles().map((role) => {
                const RoleIcon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <RoleIcon className="h-3 w-3" />
                      {role}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Collapsed mode indicator */}
      {isCollapsed && isDevMode && (
        <div className="flex justify-center">
          <Badge className="bg-blue-100 text-blue-800 text-xs">
            <Settings className="h-3 w-3" />
          </Badge>
        </div>
      )}
    </div>
  );
}
