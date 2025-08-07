"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Download } from "lucide-react";
import Link from "next/link";
import Pagination, { usePagination } from "@/components/ui/pagination";
import LeadsTable from "@/components/leads/leads-table";
import LeadsFilters, { FilterValues } from "@/components/leads/leads-filters";
import { PermissionGate } from "@/components/auth/PermissionGate";

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

export default function LeadsPage() {
  const { data: session, status } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const loadingRef = useRef(false); // Use ref for loading to avoid re-renders
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingLeadIds, setUpdatingLeadIds] = useState<number[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    status: [],
    subStatus: [],
    priority: [],
    assignee: [],
    businessCategory: [],
    businessIndustry: [],
    city: [],
    state: [],
  });

  // Use pagination hook
  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
  } = usePagination(10);

  // Debounced filters to avoid too many API calls
  const [debouncedFilters, setDebouncedFilters] =
    useState<FilterValues>(filters);
  const previousFilters = useRef<FilterValues>(filters);

  // Debounce filters and reset pagination when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);

      // Reset pagination only when filters actually change
      const filtersChanged =
        JSON.stringify(previousFilters.current) !== JSON.stringify(filters);
      if (filtersChanged) {
        resetPagination();
        previousFilters.current = filters;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, resetPagination]);

  const fetchLeads = useCallback(
    async (page: number, size: number, filterValues: FilterValues) => {
      loadingRef.current = true;
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: size.toString(),
        });

        // Add search parameters if there's a search term
        if (filterValues.search) {
          params.append("search", filterValues.search);
        }

        // Add filter parameters
        if (filterValues.status.length > 0) {
          filterValues.status.forEach((status) =>
            params.append("status", status)
          );
        }
        if (filterValues.subStatus.length > 0) {
          filterValues.subStatus.forEach((subStatus) =>
            params.append("subStatus", subStatus)
          );
        }
        if (filterValues.assignee.length > 0) {
          filterValues.assignee.forEach((assignee) =>
            params.append("assignee", assignee)
          );
        }
        if (filterValues.businessCategory.length > 0) {
          filterValues.businessCategory.forEach((category) =>
            params.append("businessCategory", category)
          );
        }
        if (filterValues.businessIndustry.length > 0) {
          filterValues.businessIndustry.forEach((industry) =>
            params.append("businessIndustry", industry)
          );
        }
        if (filterValues.city.length > 0) {
          filterValues.city.forEach((city) => params.append("city", city));
        }
        if (filterValues.state.length > 0) {
          filterValues.state.forEach((state) => params.append("state", state));
        }

        const response = await fetch(`/api/leads?${params}`);
        const result = await response.json();

        if (result.success) {
          // Only update leads state if data actually changed
          setLeads((prevLeads) => {
            const newLeads = result.data.leads;
            // Quick shallow comparison - if IDs and length are same, likely same data
            if (
              prevLeads.length === newLeads.length &&
              prevLeads.length > 0 &&
              newLeads.length > 0 &&
              prevLeads[0]?.id === newLeads[0]?.id &&
              prevLeads[prevLeads.length - 1]?.id ===
                newLeads[newLeads.length - 1]?.id
            ) {
              // Perform deep comparison for first few items to be sure
              const isDifferent = prevLeads
                .slice(0, Math.min(3, prevLeads.length))
                .some((lead, index) => {
                  const newLead = newLeads[index];
                  return (
                    lead.id !== newLead.id ||
                    lead.name !== newLead.name ||
                    lead.email !== newLead.email ||
                    lead.status !== newLead.status
                  );
                });

              if (!isDifferent) {
                return prevLeads; // Return previous state if data is the same
              }
            }
            return newLeads;
          });

          setTotalCount((prevCount) => {
            const newCount = result.data.pagination.total;
            if (prevCount === newCount) {
              return prevCount; // Return previous state if same
            }
            return newCount;
          });
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        loadingRef.current = false;
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    },
    [isInitialLoad]
  ); // Only isInitialLoad as dependency

  // Separate effect to trigger data fetching when parameters change
  useEffect(() => {
    if (session) {
      fetchLeads(currentPage, pageSize, debouncedFilters);
    }
  }, [session, currentPage, pageSize, debouncedFilters, fetchLeads]);

  // Memoize pagination object to prevent unnecessary re-renders
  const paginationData = useMemo(
    () => ({
      currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
      pageSize,
      hasNextPage: currentPage < Math.ceil(totalCount / pageSize),
      hasPrevPage: currentPage > 1,
    }),
    [currentPage, totalCount, pageSize]
  );

  // Memoize leads array to prevent table rows from re-rendering unnecessarily
  const memoizedLeads = useMemo(() => leads, [leads]);

  // Force refresh data from server
  const refreshLeads = useCallback(() => {
    if (session) {
      fetchLeads(currentPage, pageSize, debouncedFilters);
    }
  }, [session, currentPage, pageSize, debouncedFilters, fetchLeads]);

  // Handle lead updates
  const handleLeadUpdate = useCallback(
    async (leadId: number, data: Partial<Lead>) => {
      // Add lead ID to updating state
      setUpdatingLeadIds((prev) => [...prev, leadId]);

      try {
        // Handle the case where assign is set to undefined
        // The API expects null for removing an assignee
        const apiData: Record<string, unknown> = { ...data };
        if ("assign" in data && data.assign === undefined) {
          apiData.assign = null;
        }

        const response = await fetch(`/api/leads/${leadId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
        });

        const result = await response.json();
        console.log("Lead update result:", result, "Data sent:", data);

        if (result.success) {
          // Update the lead in the local state to avoid refetching the entire list
          setLeads((prevLeads) => {
            const updatedLeads = prevLeads.map((lead) =>
              lead.id === leadId
                ? {
                    ...lead,
                    ...data,
                    // Always use the assignee from the API response if available
                    assignee: result.data.assignee,
                    // Make sure assign is updated correctly
                    assign: "assign" in data ? data.assign : lead.assign,
                  }
                : lead
            );
            console.log(
              "Updated lead state:",
              updatedLeads.find((l) => l.id === leadId)
            );
            return updatedLeads;
          });

          // Force refresh data from server to ensure consistency
          setTimeout(() => refreshLeads(), 500);
        } else {
          console.error("Failed to update lead:", result.error);
          // Could add toast notification here
        }
      } catch (error) {
        console.error("Error updating lead:", error);
        // Could add toast notification here
      } finally {
        // Remove lead ID from updating state
        setUpdatingLeadIds((prev) => prev.filter((id) => id !== leadId));
      }
    },
    [refreshLeads]
  );

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: [],
      subStatus: [],
      assignee: [],
      businessCategory: [],
      businessIndustry: [],
      city: [],
      state: [],
    });
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();

      // Add search parameter if there's a search term
      if (debouncedFilters.search) {
        params.append("search", debouncedFilters.search);
      }

      // Add filter parameters
      if (debouncedFilters.status.length > 0) {
        debouncedFilters.status.forEach((status) =>
          params.append("status", status)
        );
      }

      if (debouncedFilters.subStatus.length > 0) {
        debouncedFilters.subStatus.forEach((subStatus) =>
          params.append("subStatus", subStatus)
        );
      }

      if (debouncedFilters.assignee.length > 0) {
        debouncedFilters.assignee.forEach((assignee) =>
          params.append("assignee", assignee)
        );
      }

      if (debouncedFilters.businessCategory.length > 0) {
        debouncedFilters.businessCategory.forEach((category) =>
          params.append("businessCategory", category)
        );
      }

      if (debouncedFilters.businessIndustry.length > 0) {
        debouncedFilters.businessIndustry.forEach((industry) =>
          params.append("businessIndustry", industry)
        );
      }

      if (debouncedFilters.city.length > 0) {
        debouncedFilters.city.forEach((city) => params.append("city", city));
      }

      if (debouncedFilters.state.length > 0) {
        debouncedFilters.state.forEach((state) =>
          params.append("state", state)
        );
      }

      const response = await fetch(`/api/leads/export?${params}`);

      if (!response.ok) {
        throw new Error("Failed to export leads");
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "leads-export.csv";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting leads:", error);
      // You could add a toast notification here for better UX
      alert("Failed to export leads. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [debouncedFilters]);

  if (status === "loading" || isInitialLoad) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Leads
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your sales leads and prospects
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button variant="outline" className="sm:w-auto" disabled>
            Import Leads
          </Button>
          <Link href="/leads/new">
            <Button className="sm:w-auto">
              <Users className="mr-2 h-4 w-4" />
              Create New Lead
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">All Leads</CardTitle>
              <CardDescription className="mt-1">
                {totalCount} lead
                {totalCount !== 1 ? "s" : ""} found
                {debouncedFilters.search && ` for "${debouncedFilters.search}"`}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
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
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </PermissionGate>
            </div>
          </div>

          <div className="mt-4">
            <LeadsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              isLoading={loadingRef.current}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LeadsTable
            leads={memoizedLeads}
            loading={loadingRef.current}
            onLeadUpdate={handleLeadUpdate}
            updatingLeadIds={updatingLeadIds}
          />
          {memoizedLeads.length === 0 &&
            !loadingRef.current &&
            !debouncedFilters.search && (
              <div className="text-center py-16 px-4">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No leads yet
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Get started by creating your first lead to begin managing your
                  sales pipeline.
                </p>
                <Link href="/leads/new">
                  <Button>
                    <Users className="mr-2 h-4 w-4" />
                    Create Your First Lead
                  </Button>
                </Link>
              </div>
            )}
        </CardContent>

        {/* Pagination */}
        {Math.ceil(totalCount / pageSize) > 1 && (
          <div className="px-6 py-4 border-t">
            <Pagination
              pagination={paginationData}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              className="justify-center"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
