"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Circle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export interface DepartmentSummary {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  totalGoals: number;
  yearlyGoals: number;
  goalsWithStatus: number;
  statusSummary: {
    green: number;
    yellow: number;
    red: number;
    notEntered: number;
  };
}

interface KpiOverviewCardProps {
  department: DepartmentSummary;
}

function getTrafficLight(summary: DepartmentSummary["statusSummary"]) {
  const { green, yellow, red, notEntered } = summary;
  const total = green + yellow + red + notEntered;
  if (total === 0) return "gray";
  if (red > 0) return "red";
  if (yellow > 0) return "yellow";
  if (green > 0) return "green";
  return "gray";
}

export function KpiOverviewCard({ department }: KpiOverviewCardProps) {
  const router = useRouter();
  const { statusSummary, totalGoals, goalsWithStatus } = department;
  const trafficLight = getTrafficLight(statusSummary);

  const coveragePercent =
    totalGoals > 0 ? Math.round((goalsWithStatus / totalGoals) * 100) : 0;

  const trafficConfig = {
    green: { bg: "bg-green-50 border-green-200", dot: "bg-green-500", text: "text-green-700", label: "On Track" },
    yellow: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500", text: "text-yellow-700", label: "At Risk" },
    red: { bg: "bg-red-50 border-red-200", dot: "bg-red-500", text: "text-red-700", label: "Critical" },
    gray: { bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400", text: "text-gray-600", label: "No Goals" },
  };

  const config = trafficConfig[trafficLight];

  return (
    <Card
      className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${config.bg}`}
      onClick={() => router.push(`/kpi/${department.key}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${config.dot} flex-shrink-0 mt-1`} />
            <CardTitle className="text-base font-semibold leading-tight">
              {department.name}
            </CardTitle>
          </div>
          <Badge variant="outline" className={`text-xs ${config.text}`}>
            {config.label}
          </Badge>
        </div>
        {department.description && (
          <p className="text-xs text-muted-foreground mt-1 pl-5">
            {department.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Status breakdown */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          <div className="flex flex-col items-center p-1.5 rounded bg-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600 mb-0.5" />
            <span className="text-base font-bold text-green-700">{statusSummary.green}</span>
            <span className="text-[10px] text-green-600">Green</span>
          </div>
          <div className="flex flex-col items-center p-1.5 rounded bg-yellow-100">
            <AlertCircle className="h-4 w-4 text-yellow-600 mb-0.5" />
            <span className="text-base font-bold text-yellow-700">{statusSummary.yellow}</span>
            <span className="text-[10px] text-yellow-600">Yellow</span>
          </div>
          <div className="flex flex-col items-center p-1.5 rounded bg-red-100">
            <XCircle className="h-4 w-4 text-red-600 mb-0.5" />
            <span className="text-base font-bold text-red-700">{statusSummary.red}</span>
            <span className="text-[10px] text-red-600">Red</span>
          </div>
          <div className="flex flex-col items-center p-1.5 rounded bg-gray-100">
            <Circle className="h-4 w-4 text-gray-400 mb-0.5" />
            <span className="text-base font-bold text-gray-500">{statusSummary.notEntered}</span>
            <span className="text-[10px] text-gray-500">Pending</span>
          </div>
        </div>

        {/* Coverage bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {totalGoals === 0
                ? "No goals created"
                : `${goalsWithStatus}/${totalGoals} goals tracked`}
            </span>
            {totalGoals > 0 && <span>{coveragePercent}%</span>}
          </div>
          {totalGoals > 0 && (
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  coveragePercent === 100
                    ? "bg-green-500"
                    : coveragePercent > 50
                    ? "bg-blue-500"
                    : "bg-gray-400"
                }`}
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-xs h-7 justify-between"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/kpi/${department.key}`);
          }}
        >
          View Details
          <ChevronRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
