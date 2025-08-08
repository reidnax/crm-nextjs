"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import Link from "next/link";
import Pagination from "@/components/ui/pagination";
import LeadsTable from "@/components/leads/leads-table";
import { FilterValues } from "@/components/leads/leads-filters";
import LeadHeaderCompact, {
  LeadAnalytics,
} from "@/components/leads/LeadHeaderCompact";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ErrorBoundary, {
  SimpleErrorFallback,
} from "@/components/ui/error-boundary";
import { useLeads, LeadsProvider } from "@/contexts/LeadsContext";

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  businessCategory?: string;
  businessIndustry?: string;
  status?: string;
  subStatus?: string;
  priority?: string;
  createdAt: string;
  creator?: {
    name: string;
    username: string;
  };
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
  assign?: number;
}

function LeadsPageContent() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const {
    state,
    isInitialized,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    setLoading,
  } = useLeads();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingLeadIds, setUpdatingLeadIds] = useState<number[]>([]);

  // Analytics query for real lead statistics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<
    LeadAnalytics,
    Error
  >({
    queryKey: ["leads", "analytics"],
    queryFn: async () => {
      const response = await fetch("/api/leads/analytics", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch lead analytics");
      }

      return result.data;
    },
    enabled: !!session,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Fetch leads function
  const fetchLeads = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Add filters
      if (state.filters.search.trim()) {
        params.set("search", state.filters.search.trim());
      }
      state.filters.status.forEach((status) => params.append("status", status));
      state.filters.subStatus.forEach((subStatus) =>
        params.append("subStatus", subStatus)
      );
      state.filters.priority.forEach((priority) =>
        params.append("priority", priority)
      );
      state.filters.assignee.forEach((assignee) =>
        params.append("assignee", assignee)
      );
      state.filters.businessCategory.forEach((category) =>
        params.append("businessCategory", category)
      );
      state.filters.businessIndustry.forEach((industry) =>
        params.append("businessIndustry", industry)
      );
      state.filters.city.forEach((city) => params.append("city", city));
      state.filters.state.forEach((state) => params.append("state", state));

      // Add pagination
      params.set("page", state.pagination.currentPage.toString());
      params.set("pageSize", state.pagination.pageSize.toString());

      const response = await fetch(`/api/leads?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch leads");
      }

      setLeads(result.data.leads || []);
      setTotalCount(result.data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [state.filters, state.pagination, status, setLoading]);

  // Fetch leads when filters or pagination change (but only after URL initialization)
  useEffect(() => {
    if (isInitialized) {
      fetchLeads();
    }
  }, [fetchLeads, isInitialized]);

  // Handlers
  const handleFiltersChange = useCallback(
    (newFilters: FilterValues) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page);
    },
    [setPage]
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      setPageSize(pageSize);
    },
    [setPageSize]
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();

      // Add current filters for export
      if (state.filters.search.trim()) {
        params.set("search", state.filters.search.trim());
      }
      state.filters.status.forEach((status) => params.append("status", status));
      state.filters.subStatus.forEach((subStatus) =>
        params.append("subStatus", subStatus)
      );
      state.filters.priority.forEach((priority) =>
        params.append("priority", priority)
      );
      state.filters.assignee.forEach((assignee) =>
        params.append("assignee", assignee)
      );
      state.filters.businessCategory.forEach((category) =>
        params.append("businessCategory", category)
      );
      state.filters.businessIndustry.forEach((industry) =>
        params.append("businessIndustry", industry)
      );
      state.filters.city.forEach((city) => params.append("city", city));
      state.filters.state.forEach((state) => params.append("state", state));

      const response = await fetch(`/api/leads/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  }, [state.filters]);

  const handleLeadUpdate = useCallback(
    async (leadId: number, updatedData: Partial<Lead>) => {
      setUpdatingLeadIds((prev) => [...prev, leadId]);

      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
          throw new Error("Failed to update lead");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to update lead");
        }

        // Update local state
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === leadId ? { ...lead, ...result.data } : lead
          )
        );

        // Refresh analytics
        queryClient.invalidateQueries({ queryKey: ["leads", "analytics"] });
      } catch (error) {
        console.error("Error updating lead:", error);
      } finally {
        setUpdatingLeadIds((prev) => prev.filter((id) => id !== leadId));
      }
    },
    [queryClient]
  );

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Unauthorized state
  if (status === "unauthenticated") {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-500 mb-4">
          You need to be logged in to view leads.
        </p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / state.pagination.pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-none">
        {/* Mobile-Optimized Header */}
        <div className="bg-white border-b border-gray-200">
          <LeadHeaderCompact
            filters={state.filters}
            analytics={analytics}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            onExport={handleExport}
            isExporting={isExporting}
            isAnalyticsLoading={analyticsLoading}
            analyticsError={null}
          />
        </div>

        {/* Content Container */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <ErrorBoundary fallback={SimpleErrorFallback}>
            <LeadsTable
              leads={leads}
              loading={state.isLoading}
              onLeadUpdate={handleLeadUpdate}
              updatingLeadIds={updatingLeadIds}
            />
          </ErrorBoundary>

          {/* Pagination and Stats */}
          {(totalCount > 0 || leads.length > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-700 order-2 sm:order-1">
                  {totalCount > 0 ? (
                    <>
                      Showing{" "}
                      {(state.pagination.currentPage - 1) *
                        state.pagination.pageSize +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        state.pagination.currentPage *
                          state.pagination.pageSize,
                        totalCount
                      )}{" "}
                      of {totalCount} results
                    </>
                  ) : (
                    `Showing ${leads.length} results`
                  )}
                </div>
                <div className="order-1 sm:order-2">
                  <Pagination
                    pagination={{
                      currentPage: state.pagination.currentPage,
                      totalPages:
                        totalPages ||
                        Math.ceil(leads.length / state.pagination.pageSize),
                      pageSize: state.pagination.pageSize,
                      totalCount: totalCount || leads.length,
                      hasNextPage:
                        state.pagination.currentPage <
                        (totalPages ||
                          Math.ceil(leads.length / state.pagination.pageSize)),
                      hasPrevPage: state.pagination.currentPage > 1,
                    }}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!state.isLoading && leads.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No leads found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {Object.entries(state.filters).some(([key, value]) =>
                  key === "search"
                    ? value.trim() !== ""
                    : Array.isArray(value)
                    ? value.length > 0
                    : !!value
                )
                  ? "Try adjusting your filters or search terms to find what you're looking for."
                  : "Get started by creating your first lead to begin building your sales pipeline."}
              </p>
              <Link href="/leads/new">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Add New Lead
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LeadsProvider>
        <LeadsPageContent />
      </LeadsProvider>
    </Suspense>
  );
}
