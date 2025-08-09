"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { useSessionWatcher } from "@/hooks/useSessionWatcher";
import {
  Home,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  Shield,
  Activity,
  Database,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { RoleGate } from "@/components/auth/RoleGate";
import { usePermissions } from "@/contexts/PermissionContext";
import { SidebarDevSwitcher } from "@/components/dev/SidebarDevSwitcher";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Team", href: "/team", icon: Users },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

const reportsNavigation = [
  {
    name: "Submit Daily Report",
    href: "/reports/daily/new",
    icon: ClipboardList,
  },
  {
    name: "Daily Analytics",
    href: "/reports/daily/analytics",
    icon: BarChart3,
  },
];

const adminNavigation = [
  { name: "Audit Logs", href: "/admin/audit", icon: Shield },
  { name: "Migrations", href: "/admin/migrations", icon: Database },
];

const debugNavigation = [
  { name: "Performance Debug", href: "/debug-new", icon: Activity },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({
  isCollapsed = false,
  onToggle,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { session: watchedSession } = useSessionWatcher(); // Watch for session changes
  const { user, hasPermissions } = usePermissions();

  // Use the watched session if available, fallback to regular session
  const currentSession = watchedSession || session;

  if (!currentSession) return null;

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter((item) => {
    // Hide Team if user doesn't have team read permissions
    if (item.name === "Team") {
      return hasPermissions(["team.read.all", "team.read.department"], false); // false = any one permission is enough
    }
    return true;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-gray-200">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900">CRM Pro</h1>
          )}
          {!isMobile && onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-blue-500 text-white">
                {getInitials(
                  session?.user?.name || session?.user?.email || "U"
                )}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.email}
                </p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {user?.role || "User"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "flex-shrink-0 h-5 w-5",
                      isActive
                        ? "text-blue-700"
                        : "text-gray-400 group-hover:text-gray-500",
                      !isCollapsed && "mr-3"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}

            {/* Reports Section */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Reports
                  </p>
                </div>
              )}
              {reportsNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                // Show Submit Daily Report to all allowed roles
                if (item.name === "Submit Daily Report") {
                  const allowedRoles = [
                    "Assignee",
                    "Manager",
                    "Admin",
                    "Admin-Dev",
                  ];
                  const userRole = currentSession?.user?.role || "";
                  if (!allowedRoles.includes(userRole)) {
                    return null;
                  }
                }

                // Show Daily Analytics only to Manager, Admin, Admin-Dev
                if (item.name === "Daily Analytics") {
                  const analyticsRoles = ["Manager", "Admin", "Admin-Dev"];
                  const userRole = currentSession?.user?.role || "";
                  if (!analyticsRoles.includes(userRole)) {
                    return null;
                  }
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-green-50 text-green-700 border-r-2 border-green-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "flex-shrink-0 h-5 w-5",
                        isActive
                          ? "text-green-700"
                          : "text-gray-400 group-hover:text-gray-500",
                        !isCollapsed && "mr-3"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Admin Section */}
            <RoleGate roles={["Admin", "Admin-Dev"]}>
              <div className="pt-4 mt-4 border-t border-gray-200">
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Admin
                    </p>
                  </div>
                )}
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-red-50 text-red-700 border-r-2 border-red-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "flex-shrink-0 h-5 w-5",
                          isActive
                            ? "text-red-700"
                            : "text-gray-400 group-hover:text-gray-500",
                          !isCollapsed && "mr-3"
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </RoleGate>

            {/* Debug Section - Admin-Dev Only */}
            <RoleGate roles={["Admin-Dev"]}>
              <div className="pt-4 mt-4 border-t border-gray-200">
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Debug
                    </p>
                  </div>
                )}
                {debugNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-orange-50 text-orange-700 border-r-2 border-orange-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "flex-shrink-0 h-5 w-5",
                          isActive
                            ? "text-orange-700"
                            : "text-gray-400 group-hover:text-gray-500",
                          !isCollapsed && "mr-3"
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </RoleGate>
          </nav>

          {/* Dev Mode Switcher */}
          <SidebarDevSwitcher isCollapsed={isCollapsed} />

          {/* User Actions */}
          <div className="flex-shrink-0 p-2 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                href="/profile"
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                )}
              >
                <User
                  className={cn(
                    "flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500",
                    !isCollapsed && "mr-3"
                  )}
                />
                {!isCollapsed && <span>Profile</span>}
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className={cn(
                  "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
                  isCollapsed && "px-3"
                )}
              >
                <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
