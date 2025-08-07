"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect, memo } from "react";
import { useSessionWatcher } from "@/hooks/useSessionWatcher";
import Sidebar from "@/components/navigation/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { DevModeIndicator } from "@/components/dev/DevModeIndicator";

interface MainLayoutProps {
  children: React.ReactNode;
}

// Memoize children content to prevent re-renders from layout state changes
const MemoizedChildren = memo(({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
});

MemoizedChildren.displayName = "MemoizedChildren";

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const { session: watchedSession } = useSessionWatcher(); // Watch for session changes
  const pathname = usePathname();

  // Use the watched session if available, fallback to regular session
  const currentSession = watchedSession || session;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Don't show sidebar on login page or home page
  const showSidebar =
    currentSession && pathname !== "/login" && pathname !== "/";

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!showSidebar) {
    return (
      <DevModeProvider>
        <PermissionProvider>{children}</PermissionProvider>
      </DevModeProvider>
    );
  }

  return (
    <DevModeProvider>
      <PermissionProvider>
        <div className="flex h-screen bg-gray-50">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          )}

          {/* Mobile Sidebar */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center space-x-4">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}

                <div className="hidden md:flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <DevModeIndicator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>

                <div className="text-sm text-gray-600 hidden sm:block">
                  Welcome back, {currentSession?.user?.name || "User"}
                  {(currentSession?.user as { isImpersonated?: boolean })
                    ?.isImpersonated && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      IMPERSONATED
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main
              className={cn(
                "flex-1 relative overflow-y-auto focus:outline-none bg-gray-50",
                "transition-all duration-300"
              )}
            >
              <div className="h-full">
                <MemoizedChildren>{children}</MemoizedChildren>
              </div>
            </main>
          </div>
          <Toaster />
        </div>
      </PermissionProvider>
    </DevModeProvider>
  );
}
