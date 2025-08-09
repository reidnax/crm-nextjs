import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { todayInIST, formatInIST } from "@/lib/timezone-utils";
import DailyReportForm from "@/components/forms/daily-report-form";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, BarChart3, Clock } from "lucide-react";
import Link from "next/link";

export default async function NewDailyReportPage() {
  // Get session on server side
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check role permissions
  const userRole = session.user.role || "";
  const allowedRoles = ["Assignee", "Manager", "Admin", "Admin-Dev"];

  if (!allowedRoles.includes(userRole)) {
    redirect("/?error=access_denied");
  }

  const userId = parseInt(session.user.id);
  const today = todayInIST();
  const todayDateString = formatInIST(today, "yyyy-MM-dd");

  // Check if today's report already exists
  let existingReport = null;
  try {
    existingReport = await prisma.dailyActivityReport.findFirst({
      where: {
        executiveId: userId,
        reportDate: new Date(todayDateString + "T00:00:00.000Z"),
      },
    });
  } catch (error) {
    console.error("Error checking existing report:", error);
  }

  // Prepare default form values
  // Create today's date at noon local time to avoid timezone shifting
  const todayAtNoon = new Date();
  todayAtNoon.setHours(12, 0, 0, 0);

  const defaultValues = {
    reportDate: todayAtNoon,
    executiveId: userId,
    zone: (session.user as any).zone || "", // Assuming zone might be in user profile
    salesUnitsToday: 0,
    collectionsTodayINR: 0,
    dealerMeetingsCount: 0,
    plantVisitsCount: 0,
    newDealershipVisitsCount: 0,
    notes: "",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Enhanced Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Submit Daily Activity Report
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-2">
                  Record your daily sales activities, meetings, and collections.
                </p>
              </div>
            </div>
          </div>

          {/* Show today's report status if exists */}
          {existingReport && (
            <Card className="border-green-200 bg-green-50/50 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-green-800 flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  Today's Report Already Submitted
                </CardTitle>
                <CardDescription className="text-green-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  You've already submitted your daily report for{" "}
                  {formatInIST(today, "MMMM d, yyyy")}.
                  {existingReport.isLateSubmission && (
                    <Badge
                      variant="outline"
                      className="ml-2 border-orange-300 text-orange-700"
                    >
                      Late Submission
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Link href={`/reports/daily?date=${todayDateString}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Today's Report
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Link href="/reports/daily">View All Reports</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Container */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Daily Activity Report Form
              </CardTitle>
              <CardDescription>
                Fill in your daily activities, sales, and visit details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <DailyReportForm defaultValues={defaultValues} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
