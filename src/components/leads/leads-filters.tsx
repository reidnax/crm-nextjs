"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Search,
  RefreshCw,
  Settings,
  Zap,
  TrendingUp,
  Phone,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssigneeSelector } from "@/components/forms/assignee-selector";

export interface FilterValues {
  search: string;
  status: string[];
  subStatus: string[];
  assignee: string[];
  businessCategory: string[];
  businessIndustry: string[];
  city: string[];
  state: string[];
}

interface LeadsFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

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

const SUB_STATUS_OPTIONS = ["Hot", "Warm", "Cold"];

const BUSINESS_CATEGORIES = [
  "Manufacturing",
  "Retail",
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Real Estate",
  "Transportation",
  "Food & Beverage",
  "Other",
];

const BUSINESS_INDUSTRIES = [
  "Automotive",
  "Energy",
  "Construction",
  "Consulting",
  "E-commerce",
  "Software",
  "Hardware",
  "Telecommunications",
  "Media",
  "Entertainment",
  "Agriculture",
  "Other",
];

// Quick filter presets for common scenarios
const QUICK_FILTERS = [
  {
    label: "New",
    icon: Zap,
    filters: { status: ["New", "Unassigned"] },
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  {
    label: "Hot",
    icon: TrendingUp,
    filters: { subStatus: ["Hot"] },
    color: "bg-red-100 text-red-700 hover:bg-red-200",
  },
  {
    label: "To Contact",
    icon: Phone,
    filters: { status: ["To be contacted"] },
    color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  },
  {
    label: "Qualified",
    icon: Target,
    filters: { status: ["Qualified"] },
    color: "bg-green-100 text-green-700 hover:bg-green-200",
  },
];

export default function LeadsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isLoading = false,
}: LeadsFiltersProps) {
  const [isDesktopFiltersOpen, setIsDesktopFiltersOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("status");

  // Ensure only one filter modal is open at a time
  React.useEffect(() => {
    if (isDesktopFiltersOpen && isMobileFiltersOpen) {
      setIsMobileFiltersOpen(false);
    }
  }, [isDesktopFiltersOpen, isMobileFiltersOpen]);

  React.useEffect(() => {
    if (isMobileFiltersOpen && isDesktopFiltersOpen) {
      setIsDesktopFiltersOpen(false);
    }
  }, [isMobileFiltersOpen, isDesktopFiltersOpen]);

  // Reset tab state when filter modal opens to prevent tab jumping
  React.useEffect(() => {
    if (isDesktopFiltersOpen || isMobileFiltersOpen) {
      // Keep current tab state when opening, don't reset to status
    }
  }, [isDesktopFiltersOpen, isMobileFiltersOpen]);

  const handleFilterChange = React.useCallback(
    (key: keyof FilterValues, value: string | string[]) => {
      onFiltersChange({
        ...filters,
        [key]: value,
      });
    },
    [filters, onFiltersChange]
  );

  const handleMultiSelectChange = React.useCallback(
    (key: keyof FilterValues, value: string, checked: boolean) => {
      const currentValues = (filters[key] as string[]) || [];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value);

      handleFilterChange(key, newValues);
    },
    [filters, handleFilterChange]
  );

  const handleQuickFilter = (quickFilter: (typeof QUICK_FILTERS)[0]) => {
    const newFilters: FilterValues = { ...filters };
    Object.entries(quickFilter.filters).forEach(([key, value]) => {
      if (key === "search") {
        newFilters.search = Array.isArray(value)
          ? value[0] || ""
          : (value as string);
      } else if (key === "status") {
        newFilters.status = value as string[];
      } else if (key === "subStatus") {
        newFilters.subStatus = value as string[];
      } else if (key === "assignee") {
        newFilters.assignee = value as string[];
      } else if (key === "businessCategory") {
        newFilters.businessCategory = value as string[];
      } else if (key === "businessIndustry") {
        newFilters.businessIndustry = value as string[];
      } else if (key === "city") {
        newFilters.city = value as string[];
      } else if (key === "state") {
        newFilters.state = value as string[];
      }
    });
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.subStatus.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.businessCategory.length > 0) count++;
    if (filters.businessIndustry.length > 0) count++;
    if (filters.city.length > 0) count++;
    if (filters.state.length > 0) count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const renderFilterBadges = () => {
    const badges: React.ReactElement[] = [];

    if (filters.status.length > 0) {
      badges.push(
        <Badge
          key="status"
          variant="secondary"
          className="gap-1 text-xs pl-2 pr-1 flex items-center"
        >
          <span>Status ({filters.status.length})</span>
          <button
            type="button"
            className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilterChange("status", []);
            }}
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
          </button>
        </Badge>
      );
    }

    if (filters.subStatus.length > 0) {
      badges.push(
        <Badge
          key="subStatus"
          variant="secondary"
          className="gap-1 text-xs pl-2 pr-1 flex items-center"
        >
          <span>Sub Status ({filters.subStatus.length})</span>
          <button
            type="button"
            className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilterChange("subStatus", []);
            }}
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
          </button>
        </Badge>
      );
    }

    if (filters.assignee.length > 0) {
      badges.push(
        <Badge
          key="assignee"
          variant="secondary"
          className="gap-1 text-xs pl-2 pr-1 flex items-center"
        >
          <span>Assignee ({filters.assignee.length})</span>
          <button
            type="button"
            className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilterChange("assignee", []);
            }}
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
          </button>
        </Badge>
      );
    }

    if (filters.businessCategory.length > 0) {
      badges.push(
        <Badge
          key="businessCategory"
          variant="secondary"
          className="gap-1 text-xs pl-2 pr-1 flex items-center"
        >
          <span>Category ({filters.businessCategory.length})</span>
          <button
            type="button"
            className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilterChange("businessCategory", []);
            }}
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
          </button>
        </Badge>
      );
    }

    if (filters.businessIndustry.length > 0) {
      badges.push(
        <Badge
          key="businessIndustry"
          variant="secondary"
          className="gap-1 text-xs pl-2 pr-1 flex items-center"
        >
          <span>Industry ({filters.businessIndustry.length})</span>
          <button
            type="button"
            className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFilterChange("businessIndustry", []);
            }}
          >
            <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
          </button>
        </Badge>
      );
    }

    return badges;
  };

  const renderCheckboxFilter = React.useCallback(
    (
      title: string,
      options: string[],
      filterKey: keyof FilterValues,
      values: string[]
    ) => (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900">{title}</Label>
        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${filterKey}-${option}`}
                checked={values.includes(option)}
                onCheckedChange={(checked) =>
                  handleMultiSelectChange(filterKey, option, checked as boolean)
                }
              />
              <Label
                htmlFor={`${filterKey}-${option}`}
                className="text-sm cursor-pointer leading-none"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </div>
    ),
    [handleMultiSelectChange]
  );

  const FilterContent = React.useCallback(
    ({ onClose }: { onClose?: () => void }) => {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              Filter Leads
            </h4>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearFilters();
                    onClose?.();
                  }}
                  className="h-8 px-3 text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(newTab) => {
              setActiveTab(newTab);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-6 mt-6">
              {renderCheckboxFilter(
                "Status",
                STATUS_OPTIONS,
                "status",
                filters.status
              )}
              <Separator />
              {renderCheckboxFilter(
                "Sub Status",
                SUB_STATUS_OPTIONS,
                "subStatus",
                filters.subStatus
              )}
            </TabsContent>

            <TabsContent value="people" className="space-y-6 mt-6">
              <AssigneeSelector
                selectedAssignees={filters.assignee}
                onAssigneesChange={(assignees) =>
                  handleFilterChange("assignee", assignees)
                }
                isLoading={isLoading}
                placeholder="Select assignees..."
              />
            </TabsContent>

            <TabsContent value="business" className="space-y-6 mt-6">
              {renderCheckboxFilter(
                "Business Category",
                BUSINESS_CATEGORIES,
                "businessCategory",
                filters.businessCategory
              )}
              <Separator />
              {renderCheckboxFilter(
                "Business Industry",
                BUSINESS_INDUSTRIES,
                "businessIndustry",
                filters.businessIndustry
              )}
            </TabsContent>
          </Tabs>
        </div>
      );
    },
    [
      activeTab,
      setActiveTab,
      hasActiveFilters,
      onClearFilters,
      filters,
      renderCheckboxFilter,
      isLoading,
      handleFilterChange,
    ]
  );

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>

        {/* Quick Filters and Advanced */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filters */}
          {QUICK_FILTERS.map((quickFilter) => (
            <Button
              key={quickFilter.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(quickFilter)}
              className={cn(
                "text-sm h-8 border-dashed transition-colors",
                quickFilter.color
              )}
              disabled={isLoading}
            >
              <quickFilter.icon className="h-4 w-4 mr-2" />
              {quickFilter.label}
            </Button>
          ))}

          <div className="flex items-center gap-2 ml-auto">
            {/* Advanced Filters - Desktop */}
            <div className="hidden md:block">
              <Popover
                open={isDesktopFiltersOpen}
                onOpenChange={setIsDesktopFiltersOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 h-8"
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4" />
                    Advanced
                    {hasActiveFilters && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {getActiveFiltersCount()}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-6" align="end">
                  <FilterContent
                    onClose={() => setIsDesktopFiltersOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Advanced Filters - Mobile */}
            <div className="md:hidden">
              <Sheet
                open={isMobileFiltersOpen}
                onOpenChange={setIsMobileFiltersOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 h-8"
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {getActiveFiltersCount()}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh]">
                  <SheetHeader className="text-left">
                    <SheetTitle>Filter Leads</SheetTitle>
                    <SheetDescription>
                      Apply filters to find the leads you&apos;re looking for.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 overflow-y-auto">
                    <FilterContent
                      onClose={() => setIsMobileFiltersOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-1 h-8 text-gray-600 hover:text-red-600"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">{renderFilterBadges()}</div>
      )}
    </div>
  );
}
