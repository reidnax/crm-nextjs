"use client";

import React from "react";
import { useDevMode } from "@/contexts/DevModeContext";
import { useVirtualSession } from "@/hooks/useVirtualSession";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  User,
  Eye,
  EyeOff,
  Crown,
  Users,
  UserCheck,
} from "lucide-react";

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

export function RoleSwitcher() {
  const sessionInfo = useVirtualSession();
  const { isDevMode, toggleDevMode, canUseDevMode } = useDevMode();

  if (!canUseDevMode) {
    return null;
  }

  const currentRole = (sessionInfo.data?.user as { role?: string })?.role;
  const IconComponent =
    ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS] || User;

  const isImpersonated = sessionInfo.isImpersonated;

  return (
    <Card className="fixed bottom-4 left-4 w-80 shadow-lg border-2 border-blue-200 bg-blue-50/90 backdrop-blur-sm z-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="h-5 w-5" />
          Dev Mode - Role Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dev Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDevMode ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-600" />
            )}
            <span className="text-sm font-medium">
              {isDevMode ? "Dev Mode ON" : "Dev Mode OFF"}
            </span>
          </div>
          <Switch checked={isDevMode} onCheckedChange={toggleDevMode} />
        </div>

        {/* Current Role Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current Role:</span>
          <Badge
            className={
              ROLE_COLORS[currentRole as keyof typeof ROLE_COLORS] ||
              "bg-gray-100 text-gray-800"
            }
          >
            <IconComponent className="h-3 w-3 mr-1" />
            {currentRole}
            {isImpersonated && (
              <span className="text-xs ml-1">(Impersonated)</span>
            )}
          </Badge>
        </div>

        {/* Info Text */}
        <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border">
          {isDevMode ? (
            <>
              <strong>User Impersonation Mode Active</strong>
              <br />
              {isImpersonated ? (
                <>
                  Currently experiencing {currentRole} permissions and data
                  filtering as an impersonated user.
                </>
              ) : (
                <>
                  Use the sidebar user switcher to impersonate different users.
                </>
              )}
            </>
          ) : (
            <>
              Toggle Dev Mode to test different user roles and permissions.
              <br />
              <strong>
                User impersonation provides authentic database testing.
              </strong>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
