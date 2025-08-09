"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  MapPinIcon,
  ChevronsUpDown,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatIndianNumber } from "@/lib/timezone-utils";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface DailyReportAnalyticsDashboardProps {
  defaultFilters: {
    fromMonth?: string;
    toMonth?: string;
    executiveId?: number;
    zone?: string;
  };
}

interface AnalyticsData {
  todaySalesUnits: number;
  todayCollectionsINR: number;
  todayVisitsTotal: number;
  monthlyTotals?: {
    salesUnits: number;
    collectionsINR: number;
    visitsTotal: number;
  };
}

interface OverviewData {
  totalSalesUnits: number;
  totalCollectionsINR: number;
  totalDealerMeetings: number;
  totalPlantVisits: number;
  totalNewDealershipVisits: number;
  groupByDay: {
    date: string;
    salesUnits: number;
    collectionsINR: number;
    visitsTotal: number;
  }[];
}

interface Executive {
  id: number;
  name: string;
  email: string;
}

export default function DailyReportAnalyticsDashboard({
  defaultFilters,
}: DailyReportAnalyticsDashboardProps) {
  const [filters, setFilters] = useState(defaultFilters);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromDateOpen, setIsFromDateOpen] = useState(false);
  const [isToDateOpen, setIsToDateOpen] = useState(false);
  const [isExecutiveOpen, setIsExecutiveOpen] = useState(false);
  const [executiveSearchValue, setExecutiveSearchValue] = useState("");
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const [zoneSearchValue, setZoneSearchValue] = useState("");

  // Load executives and zones
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [executivesRes, zonesRes] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/meta/zones"),
        ]);

        if (executivesRes.ok) {
          const executivesData = await executivesRes.json();
          // Filter for executives (Assignees) from team data
          const execs = (executivesData.data || [])
            .filter((user: any) => user.role === "Assignee")
            .map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }));
          setExecutives(execs);
        }

        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          setZones(zonesData.data.zones || []);
        }
      } catch (error) {
        console.error("Failed to load metadata:", error);
      }
    }
    loadMetadata();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Build query parameters
        const analyticsParams = new URLSearchParams();
        const overviewParams = new URLSearchParams();

        if (filters.fromMonth) {
          analyticsParams.set("fromMonth", filters.fromMonth);
          overviewParams.set("fromMonth", filters.fromMonth);
        }
        if (filters.toMonth) {
          analyticsParams.set("toMonth", filters.toMonth);
          overviewParams.set("toMonth", filters.toMonth);
        }
        if (filters.executiveId) {
          analyticsParams.set("executiveId", filters.executiveId.toString());
          overviewParams.set("executiveId", filters.executiveId.toString());
        }
        if (filters.zone) {
          analyticsParams.set("zone", filters.zone);
          overviewParams.set("zone", filters.zone);
        }

        const [analyticsRes, overviewRes] = await Promise.all([
          fetch(`/api/analytics/daily-overview?${analyticsParams.toString()}`),
          fetch(`/api/reports/daily/overview?${overviewParams.toString()}`),
        ]);

        if (!analyticsRes.ok) {
          throw new Error("Failed to fetch analytics data");
        }
        if (!overviewRes.ok) {
          throw new Error("Failed to fetch overview data");
        }

        const analyticsResult = await analyticsRes.json();
        const overviewResult = await overviewRes.json();

        setAnalyticsData(analyticsResult.data);
        setOverviewData(overviewResult.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm"
            >
              <CardHeader className="pb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2].map((i) => (
            <Card
              key={i}
              className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm"
            >
              <CardHeader className="pb-4">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Filters */}
      <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter analytics by date range, executive, and zone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                From Month
              </Label>
              <Popover open={isFromDateOpen} onOpenChange={setIsFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-white border-gray-300 hover:bg-gray-50"
                  >
                    {filters.fromMonth || "Select month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 max-h-[300px] overflow-y-auto"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <Calendar
                    mode="single"
                    selected={
                      filters.fromMonth
                        ? new Date(filters.fromMonth + "-01")
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        const monthKey = format(date, "yyyy-MM");
                        handleFilterChange("fromMonth", monthKey);
                        setIsFromDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                To Month
              </Label>
              <Popover open={isToDateOpen} onOpenChange={setIsToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-white border-gray-300 hover:bg-gray-50"
                  >
                    {filters.toMonth || "Select month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 max-h-[300px] overflow-y-auto"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <Calendar
                    mode="single"
                    selected={
                      filters.toMonth
                        ? new Date(filters.toMonth + "-01")
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        const monthKey = format(date, "yyyy-MM");
                        handleFilterChange("toMonth", monthKey);
                        setIsToDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Executive
              </Label>
              <Popover open={isExecutiveOpen} onOpenChange={setIsExecutiveOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isExecutiveOpen}
                    className="w-full justify-between h-12 bg-white border-gray-300 hover:bg-gray-50"
                  >
                    {filters.executiveId
                      ? executives.find(
                          (exec) => exec.id === filters.executiveId
                        )?.name || "Unknown executive"
                      : "All executives"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-0 max-h-[300px] overflow-y-auto"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <Command>
                    <CommandInput
                      placeholder="Search executives..."
                      value={executiveSearchValue}
                      onValueChange={setExecutiveSearchValue}
                    />
                    <CommandEmpty>No executives found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          handleFilterChange("executiveId", undefined);
                          setExecutiveSearchValue("");
                          setIsExecutiveOpen(false);
                        }}
                      >
                        All executives
                      </CommandItem>
                      {executives
                        .filter(
                          (exec) =>
                            !executiveSearchValue ||
                            (exec.name || "")
                              .toLowerCase()
                              .includes(executiveSearchValue.toLowerCase()) ||
                            exec.email
                              .toLowerCase()
                              .includes(executiveSearchValue.toLowerCase())
                        )
                        .map((exec) => (
                          <CommandItem
                            key={exec.id}
                            value={exec.name || exec.email}
                            onSelect={() => {
                              handleFilterChange("executiveId", exec.id);
                              setExecutiveSearchValue("");
                              setIsExecutiveOpen(false);
                            }}
                          >
                            {exec.name || exec.email}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Zone</Label>
              <Popover open={isZoneOpen} onOpenChange={setIsZoneOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isZoneOpen}
                    className="w-full justify-between h-12 bg-white border-gray-300 hover:bg-gray-50"
                  >
                    {filters.zone || "All zones"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-0 max-h-[300px] overflow-y-auto"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <Command>
                    <CommandInput
                      placeholder="Search zones..."
                      value={zoneSearchValue}
                      onValueChange={setZoneSearchValue}
                    />
                    <CommandEmpty>No zones found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          handleFilterChange("zone", undefined);
                          setZoneSearchValue("");
                          setIsZoneOpen(false);
                        }}
                      >
                        All zones
                      </CommandItem>
                      {zones
                        .filter(
                          (zone) =>
                            !zoneSearchValue ||
                            zone
                              .toLowerCase()
                              .includes(zoneSearchValue.toLowerCase())
                        )
                        .map((zone) => (
                          <CommandItem
                            key={zone}
                            value={zone}
                            onSelect={() => {
                              handleFilterChange("zone", zone);
                              setZoneSearchValue("");
                              setIsZoneOpen(false);
                            }}
                          >
                            {zone}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="w-full sm:w-auto"
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-700">
              Today's Sales Units
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatIndianNumber(analyticsData?.todaySalesUnits || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">units sold today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-700">
              Today's Collections
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUpIcon className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatINR(analyticsData?.todayCollectionsINR || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">collected today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-700">
              Today's Visits
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatIndianNumber(analyticsData?.todayVisitsTotal || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">visits completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Aggregates */}
      {analyticsData?.monthlyTotals && (
        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Period Summary
            </CardTitle>
            <CardDescription>
              Totals for the selected date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {formatIndianNumber(analyticsData.monthlyTotals.salesUnits)}
                </div>
                <p className="text-sm text-gray-600 mt-1">Total Sales Units</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-3xl font-bold text-green-600">
                  {formatINR(analyticsData.monthlyTotals.collectionsINR)}
                </div>
                <p className="text-sm text-gray-600 mt-1">Total Collections</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-3xl font-bold text-purple-600">
                  {formatIndianNumber(analyticsData.monthlyTotals.visitsTotal)}
                </div>
                <p className="text-sm text-gray-600 mt-1">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUpIcon className="h-5 w-5 text-blue-600" />
              Sales Units Trend
            </CardTitle>
            <CardDescription>Daily sales units over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overviewData?.groupByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                  formatter={(value) => [
                    formatIndianNumber(Number(value)),
                    "Sales Units",
                  ]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="salesUnits"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUpIcon className="h-5 w-5 text-green-600" />
              Collections Trend
            </CardTitle>
            <CardDescription>Daily collections in INR</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overviewData?.groupByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  stroke="#6b7280"
                />
                <YAxis
                  tickFormatter={(value) => formatINR(value).replace("₹", "")}
                  stroke="#6b7280"
                />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                  formatter={(value) => [
                    formatINR(Number(value)),
                    "Collections",
                  ]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="collectionsINR"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ fill: "#16a34a", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#16a34a", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5 text-purple-600" />
              Visits Overview
            </CardTitle>
            <CardDescription>Daily visits breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overviewData?.groupByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                  formatter={(value) => [
                    formatIndianNumber(Number(value)),
                    "Total Visits",
                  ]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="visitsTotal"
                  fill="#9333ea"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5 text-orange-600" />
              Visit Types Breakdown
            </CardTitle>
            <CardDescription>Distribution of visit types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-700">
                  Dealer Meetings
                </span>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  {formatIndianNumber(overviewData?.totalDealerMeetings || 0)}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm font-medium text-green-700">
                  Plant Visits
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  {formatIndianNumber(overviewData?.totalPlantVisits || 0)}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-sm font-medium text-purple-700">
                  New Dealership Visits
                </span>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-800"
                >
                  {formatIndianNumber(
                    overviewData?.totalNewDealershipVisits || 0
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Table View */}
      <Card className="shadow-sm border-gray-200 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Daily Breakdown
          </CardTitle>
          <CardDescription>
            Detailed view of daily activities for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium text-gray-700">
                    Date
                  </TableHead>
                  <TableHead className="text-right font-medium text-gray-700">
                    Sales Units
                  </TableHead>
                  <TableHead className="text-right font-medium text-gray-700">
                    Collections
                  </TableHead>
                  <TableHead className="text-right font-medium text-gray-700">
                    Total Visits
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overviewData?.groupByDay.map((day) => (
                  <TableRow key={day.date} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">
                      {format(new Date(day.date), "PPP")}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatIndianNumber(day.salesUnits)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600 font-medium">
                      {formatINR(day.collectionsINR)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {formatIndianNumber(day.visitsTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!overviewData?.groupByDay ||
                  overviewData.groupByDay.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500 py-8"
                    >
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
