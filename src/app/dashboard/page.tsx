"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Calendar,
  CheckSquare,
  FileText,
  TrendingUp,
  Phone,
  Clock,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Lead {
  id: number;
  name: string;
  company?: string;
  createdAt: string;
}

interface Meeting {
  id: number;
  subject: string;
  startTime: string;
  lead: {
    name: string;
  };
}

interface DashboardData {
  stats: {
    totalLeads: number;
    leadsGrowthPercent: number;
    meetingsToday: number;
    upcomingMeetingsCount: number;
    pendingTasks: number;
    overdueTasks: number;
    totalNotes: number;
    notesThisWeek: number;
  };
  recentLeads: Lead[];
  upcomingMeetings: Meeting[];
  dueTasks: unknown[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data when user is authenticated
    if (session && status === "authenticated") {
      fetchDashboardData();
    } else if (status === "unauthenticated") {
      // Stop loading if user is unauthenticated
      setLoading(false);
    }
  }, [session, status]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (status === "unauthenticated" || !session) {
    return <div>Access Denied</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">Loading dashboard data...</div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your business today
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Leads</p>
                <p className="text-3xl font-bold">
                  {dashboardData?.stats.totalLeads || 0}
                </p>
                <p className="text-blue-100 text-xs mt-1">
                  {dashboardData?.stats.leadsGrowthPercent
                    ? `+${dashboardData.stats.leadsGrowthPercent}% from last month`
                    : "No change from last month"}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Meetings Today
                </p>
                <p className="text-3xl font-bold">
                  {dashboardData?.stats.meetingsToday || 0}
                </p>
                <p className="text-green-100 text-xs mt-1">
                  {dashboardData?.stats.upcomingMeetingsCount || 0} upcoming
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Pending Tasks
                </p>
                <p className="text-3xl font-bold">
                  {dashboardData?.stats.pendingTasks || 0}
                </p>
                <p className="text-orange-100 text-xs mt-1">
                  {dashboardData?.stats.overdueTasks || 0} overdue
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <CheckSquare className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Total Notes
                </p>
                <p className="text-3xl font-bold">
                  {dashboardData?.stats.totalNotes || 0}
                </p>
                <p className="text-purple-100 text-xs mt-1">
                  {dashboardData?.stats.notesThisWeek || 0} this week
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Recent Leads
            </CardTitle>
            <CardDescription>Latest leads added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentLeads.length ? (
              <div className="space-y-4">
                {dashboardData.recentLeads.map((lead: Lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {lead.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {lead.company || "No company"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(lead.createdAt)}
                      </p>
                    </div>
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No recent leads</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Upcoming Meetings
            </CardTitle>
            <CardDescription>Next scheduled meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.upcomingMeetings.length ? (
              <div className="space-y-4">
                {dashboardData.upcomingMeetings.map((meeting: Meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {meeting.subject}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {meeting.lead.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(meeting.startTime)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming meetings</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                className="w-full justify-start h-12"
                size="lg"
                onClick={() => router.push("/leads/new")}
              >
                <Users className="mr-2 h-4 w-4" />
                Create New Lead
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12"
                size="lg"
                onClick={() => router.push("/meetings")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12"
                size="lg"
                onClick={() => router.push("/tasks")}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Add Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12"
                size="lg"
                onClick={() => router.push("/notes")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
