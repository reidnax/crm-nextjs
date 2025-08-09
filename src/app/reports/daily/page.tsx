import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PermissionManager } from "@/lib/permissions/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  TrendingUp,
  Users,
  Building,
  Plus,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatInIST, todayInIST } from "@/lib/timezone-utils";
import { prisma } from "@/lib/prisma";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DailyReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id);

  // Check permissions for daily reports
  const canSubmit = await PermissionManager.hasPermission(
    userId,
    "reports.daily.create"
  );
  const canViewAll = await PermissionManager.hasPermission(
    userId,
    "reports.daily.read.all"
  );
  const isManager = ["Manager", "Admin", "Admin-Dev"].includes(
    session.user.role
  );

  const targetDate = params.date || formatInIST(todayInIST(), "yyyy-MM-dd");

  // Fetch user's report for the target date
  let userReport = null;
  try {
    userReport = await prisma.dailyActivityReport.findFirst({
      where: {
        executiveId: userId,
        reportDate: new Date(targetDate + "T00:00:00.000Z"),
      },
      include: {
        executive: {
          select: {
            name: true,
            department: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user report:", error);
  }

  // Fetch user's own reports (last 30 days)
  let userReports = [];
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    userReports = await prisma.dailyActivityReport.findMany({
      where: {
        executiveId: userId,
        reportDate: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        executive: {
          select: {
            name: true,
            department: true,
          },
        },
      },
      orderBy: [{ reportDate: "desc" }, { submittedAt: "desc" }],
      take: 15,
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
  }

  // Fetch recent reports from all users if user can view all
  let allReports = [];
  if (canViewAll) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      allReports = await prisma.dailyActivityReport.findMany({
        where: {
          reportDate: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          executive: {
            select: {
              name: true,
              department: true,
            },
          },
        },
        orderBy: [{ reportDate: "desc" }, { submittedAt: "desc" }],
        take: 20,
      });
    } catch (error) {
      console.error("Error fetching all reports:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Daily Reports
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {params.date
                    ? `Report for ${formatInIST(
                        new Date(targetDate),
                        "MMMM d, yyyy"
                      )}`
                    : "Track and view daily activity reports"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            {canSubmit && (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/reports/daily/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Report
                </Link>
              </Button>
            )}
            {isManager && (
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/reports/daily/analytics">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Success Message for Submitted Report */}
        {params.date && userReport && (
          <Card className="border-green-200 bg-green-50/50 backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-green-800 flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5" />
                Report Submitted Successfully
              </CardTitle>
              <CardDescription className="text-green-700">
                Your daily report for{" "}
                {formatInIST(new Date(targetDate), "MMMM d, yyyy")} has been
                recorded.
                {userReport.isLateSubmission && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-orange-300 text-orange-700"
                  >
                    Late Submission
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* User's Report for Target Date */}
        {userReport ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Your Report -{" "}
                {new Date(userReport.reportDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Submitted on{" "}
                {formatInIST(userReport.submittedAt, "MMM d, yyyy 'at' h:mm a")}
                {userReport.isLateSubmission && (
                  <Badge
                    variant="outline"
                    className="border-orange-300 text-orange-700"
                  >
                    Late Submission
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                    <MapPin className="h-4 w-4" />
                    Zone
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {userReport.zone}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    Sales Units
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {userReport.salesUnitsToday}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
                    💰 Collections
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    ₹
                    {Number(userReport.collectionsTodayINR).toLocaleString(
                      "en-IN",
                      { maximumFractionDigits: 2 }
                    )}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-2">
                    <Users className="h-4 w-4" />
                    Dealer Meetings
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {userReport.dealerMeetingsCount}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 mb-2">
                    <Building className="h-4 w-4" />
                    Plant Visits
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">
                    {userReport.plantVisitsCount}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-teal-700 mb-2">
                    🏪 New Dealership Visits
                  </div>
                  <p className="text-2xl font-bold text-teal-900">
                    {userReport.newDealershipVisitsCount}
                  </p>
                </div>
              </div>

              {userReport.notes && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {userReport.notes}
                  </p>
                </div>
              )}
            </CardContent>
            <CardContent className="pt-4 border-t border-gray-100">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/reports/daily">View All Reports</Link>
              </Button>
            </CardContent>
          </Card>
        ) : params.date ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                No Report Found
              </CardTitle>
              <CardDescription>
                No daily report found for{" "}
                {formatInIST(new Date(targetDate), "MMMM d, yyyy")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                {canSubmit && (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/reports/daily/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Report for This Date
                    </Link>
                  </Button>
                )}
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/reports/daily">View All Reports</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* User's Own Reports (only show when not viewing a specific date) */}
        {!params.date && userReports.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Your Recent Reports
              </CardTitle>
              <CardDescription>
                Your daily reports from the last 30 days ({userReports.length}{" "}
                reports)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50/50 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(report.reportDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              timeZone: "UTC",
                            }
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          {report.zone} • Submitted{" "}
                          {formatInIST(report.submittedAt, "MMM d 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm w-full sm:w-auto">
                      <div className="text-center flex-1 sm:flex-none">
                        <p className="font-medium text-green-600">
                          {report.salesUnitsToday}
                        </p>
                        <p className="text-gray-500 text-xs">Sales</p>
                      </div>
                      <div className="text-center flex-1 sm:flex-none">
                        <p className="font-medium text-purple-600">
                          ₹
                          {Number(report.collectionsTodayINR).toLocaleString(
                            "en-IN",
                            { maximumFractionDigits: 0 }
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">Collections</p>
                      </div>
                      <div className="text-center flex-1 sm:flex-none">
                        <p className="font-medium text-blue-600">
                          {report.dealerMeetingsCount +
                            report.plantVisitsCount +
                            report.newDealershipVisitsCount}
                        </p>
                        <p className="text-gray-500 text-xs">Visits</p>
                      </div>
                      {report.isLateSubmission && (
                        <Badge
                          variant="outline"
                          className="border-orange-300 text-orange-700"
                        >
                          Late
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Reports (for managers/admins, only show when not viewing a specific date) */}
        {!params.date && canViewAll && allReports.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-green-600" />
                Team Reports
              </CardTitle>
              <CardDescription>
                Latest daily reports from your team (last 7 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50/50 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {report.executive.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatInIST(
                            new Date(report.reportDate),
                            "MMM d, yyyy"
                          )}{" "}
                          • {report.zone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm w-full sm:w-auto">
                      <div className="text-center flex-1 sm:flex-none">
                        <p className="font-medium text-green-600">
                          {report.salesUnitsToday}
                        </p>
                        <p className="text-gray-500 text-xs">Sales</p>
                      </div>
                      <div className="text-center flex-1 sm:flex-none">
                        <p className="font-medium text-purple-600">
                          ₹
                          {Number(report.collectionsTodayINR).toLocaleString(
                            "en-IN",
                            { maximumFractionDigits: 0 }
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">Collections</p>
                      </div>
                      {report.isLateSubmission && (
                        <Badge
                          variant="outline"
                          className="border-orange-300 text-orange-700"
                        >
                          Late
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row flex-wrap gap-3">
            {canSubmit && (
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/reports/daily/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Today's Report
                </Link>
              </Button>
            )}
            {isManager && (
              <>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/reports/daily/analytics">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
