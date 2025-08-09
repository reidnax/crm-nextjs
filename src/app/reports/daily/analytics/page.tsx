import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PermissionManager } from "@/lib/permissions/core";
import {
  getCurrentMonthStartIST,
  getCurrentMonthEndIST,
  formatInIST,
} from "@/lib/timezone-utils";
import DailyReportAnalyticsDashboard from "@/components/reports/daily-analytics-dashboard";
import { toast } from "sonner";
import { BarChart3, TrendingUp, BarChart } from "lucide-react";

export default async function DailyReportAnalyticsPage() {
  // Get session on server side
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check permissions for daily report analytics
  const userId = parseInt(session.user.id);
  const canViewAnalytics = await PermissionManager.hasPermission(
    userId,
    "reports.daily.analytics"
  );

  if (!canViewAnalytics) {
    redirect("/?error=access_denied");
  }

  // Prepare default filters
  const monthStart = getCurrentMonthStartIST();
  const monthEnd = getCurrentMonthEndIST();

  const defaultFilters = {
    fromMonth: formatInIST(monthStart, "yyyy-MM"),
    toMonth: formatInIST(monthEnd, "yyyy-MM"),
    executiveId: undefined,
    zone: undefined,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Enhanced Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                <BarChart className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Daily Report Analytics
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-2">
                  Comprehensive analytics and insights from daily activity
                  reports.
                </p>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-0 overflow-hidden">
            <DailyReportAnalyticsDashboard defaultFilters={defaultFilters} />
          </div>
        </div>
      </div>
    </div>
  );
}
