"use client";

import React from "react";
import { useDevMode, AVAILABLE_ROLES } from "@/contexts/DevModeContext";
import { useVirtualSession } from "@/hooks/useVirtualSession";
import { VIRTUAL_TEST_USERS } from "@/lib/virtual-users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  User,
  Shield,
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

  const currentRole = virtualSession.data?.user?.role;
  const IconComponent =
    ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS] || User;

  const isVirtual = virtualSession.isVirtual;

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
            {isVirtual && <span className="text-xs ml-1">(Virtual)</span>}
          </Badge>
        </div>

        {/* Virtual User Info */}
        {isVirtual && virtualUser && (
          <div className="text-xs bg-blue-100 p-2 rounded border">
            <div>
              <strong>Virtual User:</strong> {virtualUser.name}
            </div>
            <div>
              <strong>ID:</strong> {virtualUser.id}
            </div>
            <div>
              <strong>Department:</strong> {virtualUser.department || "None"}
            </div>
          </div>
        )}

        {/* Role Selector (only visible in dev mode) */}
        {isDevMode && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Virtual User Role:
            </label>
            <Select
              value={simulatedRole || "reset"}
              onValueChange={(value) =>
                setSimulatedRole(value === "reset" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select virtual user role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reset">Use Real User (Admin-Dev)</SelectItem>
                {AVAILABLE_ROLES.map((role) => {
                  const RoleIcon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <RoleIcon className="h-4 w-4" />
                        {role}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quick Reset Button */}
        {isDevMode && simulatedRole && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulatedRole(null)}
            className="w-full"
          >
            Reset to Admin-Dev
          </Button>
        )}

        {/* Info Text */}
        <div className="text-xs text-gray-600 bg-white/50 p-2 rounded border">
          {isDevMode ? (
            <>
              <strong>Virtual User Mode Active</strong>
              <br />
              {isVirtual ? (
                <>
                  Experiencing authentic {currentRole} permissions and data
                  filtering.
                </>
              ) : (
                <>
                  Select a virtual user role to test authentic role experience.
                </>
              )}
            </>
          ) : (
            <>
              Toggle Dev Mode to test different role permissions.
              <br />
              <strong>Virtual users provide authentic database testing.</strong>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
