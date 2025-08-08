"use client";

import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// No Select components needed
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterModal } from "@/components/ui/filter-modal";
import { Input } from "@/components/ui/input";
import {
  Plus,
  X,
  Settings,
  BarChart3,
  Loader2,
  Download,
  Search,
} from "lucide-react";
import { FilterValues } from "./leads-filters";
import Link from "next/link";
import { PermissionGate } from "@/components/auth/PermissionGate";

export interface LeadAnalytics {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

interface LeadHeaderCompactProps {
  filters: FilterValues;
  analytics: LeadAnalytics | undefined;
  isAnalyticsLoading: boolean;
  analyticsError: Error | null;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onExport: () => void;
  isExporting: boolean;
}

const QUICK_FILTERS = [
  {
    label: "New",
    filters: { status: ["New", "Unassigned"] },
    color: "bg-blue-100 text-blue-700",
  },
  {
    label: "Hot",
    filters: { subStatus: ["Hot"] },
    color: "bg-red-100 text-red-700",
  },
  {
    label: "Qualified",
    filters: { status: ["Qualified"] },
    color: "bg-green-100 text-green-700",
  },
];

const STATUS_OPTIONS = [
  "New",
  "Unassigned",
  "To be contacted",
  "Attempted to contact",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Lost",
  "Converted",
];

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const SUB_STATUS_OPTIONS = ["Hot", "Warm", "Cold"];

const LeadHeaderCompact = memo(function LeadHeaderCompact({
  filters,
  analytics,
  isAnalyticsLoading,
  analyticsError,
  onFiltersChange,
  onClearFilters,
  onExport,
  isExporting,
}: LeadHeaderCompactProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status.length > 0 ||
    filters.subStatus.length > 0 ||
    filters.priority.length > 0 ||
    filters.assignee.length > 0 ||
    filters.businessCategory.length > 0 ||
    filters.businessIndustry.length > 0 ||
    filters.city.length > 0 ||
    filters.state.length > 0;

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.status.length > 0) count++;
    if (filters.subStatus.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.businessCategory.length > 0) count++;
    if (filters.businessIndustry.length > 0) count++;
    if (filters.city.length > 0) count++;
    if (filters.state.length > 0) count++;
    return count;
  };

  const handleQuickFilter = (quickFilters: Partial<FilterValues>) => {
    // Merge with existing filters, replacing only the specified filter types
    const newFilters = { ...filters };

    Object.entries(quickFilters).forEach(([key, value]) => {
      if (key in newFilters && Array.isArray(value)) {
        // Safely update the filters
        if (
          key === "status" ||
          key === "subStatus" ||
          key === "priority" ||
          key === "assignee" ||
          key === "businessCategory" ||
          key === "businessIndustry" ||
          key === "city" ||
          key === "state"
        ) {
          // Type assertion is necessary here
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newFilters as any)[key] = value;
        }
      }
    });

    onFiltersChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  // Filter sections configuration
  const filterSections = [
    {
      id: "status",
      label: "Status",
      options: STATUS_OPTIONS,
      selectedValues: filters.status,
      onChange: (values: string[]) =>
        onFiltersChange({ ...filters, status: values }),
    },
    {
      id: "subStatus",
      label: "Sub Status",
      options: SUB_STATUS_OPTIONS,
      selectedValues: filters.subStatus,
      onChange: (values: string[]) =>
        onFiltersChange({ ...filters, subStatus: values }),
      maxHeight: "40",
    },
    {
      id: "priority",
      label: "Priority",
      options: PRIORITY_OPTIONS,
      selectedValues: filters.priority,
      onChange: (values: string[]) =>
        onFiltersChange({ ...filters, priority: values }),
    },
  ];

  const leadStats = analytics;

  return (
    <div className="px-4 py-3 md:px-6">
      {/* Main Header Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Title + Quick Stats */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Leads
            </h1>
            {!isAnalyticsLoading && !analyticsError && leadStats && (
              <Popover open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {leadStats.total}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Lead Analytics</h4>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-700">
                          {leadStats.total}
                        </div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {leadStats.new}
                        </div>
                        <div className="text-xs text-gray-500">New</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {leadStats.contacted}
                        </div>
                        <div className="text-xs text-gray-500">Contacted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {leadStats.qualified}
                        </div>
                        <div className="text-xs text-gray-500">Qualified</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">
                          {leadStats.converted}
                        </div>
                        <div className="text-xs text-gray-500">Converted</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {leadStats.hot}
                        </div>
                        <div className="text-xs text-gray-500">Hot</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {leadStats.warm}
                        </div>
                        <div className="text-xs text-gray-500">Warm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {leadStats.cold}
                        </div>
                        <div className="text-xs text-gray-500">Cold</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Conversion Rate</span>
                        <span>
                          {leadStats.total > 0
                            ? Math.round(
                                (leadStats.converted / leadStats.total) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-emerald-500 h-1 rounded-full transition-all"
                          style={{
                            width:
                              leadStats.total > 0
                                ? `${
                                    (leadStats.converted / leadStats.total) *
                                    100
                                  }%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {isAnalyticsLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading analytics...
              </div>
            )}
          </div>

          {/* Inline Quick Stats */}
          {!isAnalyticsLoading && !analyticsError && leadStats && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              {leadStats.new > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 text-xs h-5"
                >
                  {leadStats.new} new
                </Badge>
              )}
              {leadStats.hot > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 text-xs h-5"
                >
                  {leadStats.hot} hot
                </Badge>
              )}
              {leadStats.qualified > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 text-xs h-5"
                >
                  {leadStats.qualified} qualified
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Search + Quick Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 flex-1 lg:max-w-2xl">
          <div className="flex-1 lg:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-9 md:h-8"
              />
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.filters)}
                className={`h-8 px-3 text-xs whitespace-nowrap ${filter.color} border-transparent flex-shrink-0`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between lg:justify-end gap-2">
          {/* Active Filters Count */}
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs h-7 px-2">
              {getActiveFilterCount()} filters
            </Badge>
          )}

          <div className="flex items-center gap-2">
            {/* Export Button */}
            <PermissionGate
              permissions={[
                "leads.export.all",
                "leads.export.assigned",
                "leads.export.department",
              ]}
              requireAll={false}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="h-8 px-2"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline ml-2">Export</span>
                {isExporting && (
                  <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                )}
              </Button>
            </PermissionGate>

            {/* Advanced Filters */}
            <FilterModal
              trigger={
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <Settings className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-2">Filters</span>
                </Button>
              }
              title="Filter Leads"
              sections={filterSections}
              hasActiveFilters={hasActiveFilters}
              onClearAll={onClearFilters}
              isOpen={isFiltersOpen}
              onOpenChange={setIsFiltersOpen}
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8 px-2"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline ml-2">Clear</span>
              </Button>
            )}

            {/* Add Lead */}
            <PermissionGate permission="leads.create">
              <Link href="/leads/new">
                <Button size="sm" className="h-8 px-3">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Add Lead</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>
      </div>
    </div>
  );
});

export default LeadHeaderCompact;
