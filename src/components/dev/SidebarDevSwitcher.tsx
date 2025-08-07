"use client";

import React from "react";
import { useDevMode } from "@/contexts/DevModeContext";
import { useVirtualSession } from "@/hooks/useVirtualSession";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Crown,
  Users,
  UserCheck,
  Eye,
  EyeOff,
  User,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const session = useVirtualSession();
  const {
    isDevMode,
    selectedUser,
    availableUsers,
    usersByRole,
    setSelectedUser,
    toggleDevMode,
    canUseDevMode,
    loading,
    refreshUsers,
    isSessionLoading,
  } = useDevMode();

  // Show loading state while session is loading
  if (isSessionLoading || canUseDevMode === null) {
    return isCollapsed ? (
      <div className="flex justify-center p-2">
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    ) : (
      <div className="space-y-2 p-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Don't show dev switcher if user doesn't have permission
  if (canUseDevMode === false) {
    return null;
  }

  const currentUser = session.data?.user;
  const currentRole = (currentUser as any)?.role;
  const IconComponent =
    ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS] || Settings;

  const isImpersonated = session.isImpersonated;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

      {/* Current User Display */}
      {!isCollapsed && currentUser && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={(currentUser as any)?.avatar || ""} />
              <AvatarFallback className="text-xs bg-blue-500 text-white">
                {getInitials((currentUser as any)?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {(currentUser as any)?.name}
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  className={cn(
                    "text-xs",
                    ROLE_COLORS[currentRole as keyof typeof ROLE_COLORS] ||
                      "bg-gray-100 text-gray-800"
                  )}
                >
                  <IconComponent className="h-3 w-3 mr-1" />
                  {currentRole}
                </Badge>
                {isImpersonated && (
                  <Badge variant="destructive" className="text-xs">
                    IMPERSONATED
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Selector (only visible in dev mode) */}
      {isDevMode && !isCollapsed && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">
              Login as User:
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshUsers}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          </div>
          <Select
            value={selectedUser?.id?.toString() || "reset"}
            onValueChange={(value) => {
              if (value === "reset") {
                setSelectedUser(null);
              } else {
                const user = availableUsers.find(
                  (u) => u.id.toString() === value
                );
                if (user) {
                  setSelectedUser(user);
                }
              }
            }}
            disabled={loading}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select user to impersonate" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="reset">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Stop Impersonation
                </div>
              </SelectItem>
              {Object.entries(usersByRole).map(([role, users]) => (
                <div key={role}>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                    {role}
                  </div>
                  {users.map((user) => {
                    const RoleIcon =
                      ROLE_ICONS[user.role as keyof typeof ROLE_ICONS];
                    return (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.avatar || ""} />
                            <AvatarFallback className="text-xs bg-gray-400 text-white">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {user.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.email}
                            </span>
                          </div>
                          <RoleIcon className="h-3 w-3 ml-auto" />
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Collapsed mode indicator */}
      {isCollapsed && isDevMode && (
        <div className="flex justify-center">
          <Badge
            className={cn(
              "text-xs",
              isImpersonated
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            )}
          >
            <Settings className="h-3 w-3" />
          </Badge>
        </div>
      )}
    </div>
  );
}
