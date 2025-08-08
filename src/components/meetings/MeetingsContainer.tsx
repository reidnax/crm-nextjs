"use client";

import { memo, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import MeetingsTable, { Meeting } from "./MeetingsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MeetingFilterState, MeetingSortState } from "./MeetingHeaderCompact";

interface MeetingsResponse {
  meetings: Meeting[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: number | null;
    limit: number;
  };
}

interface MeetingsContainerProps {
  filters: MeetingFilterState;
  sort: MeetingSortState;
  onEditMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meeting: Meeting) => void;
  onCompleteMeeting: (meeting: Meeting) => void;
  leadId?: number;
  className?: string;
}

const MeetingsContainer = memo(function MeetingsContainer({
  filters,
  sort,
  onEditMeeting,
  onDeleteMeeting,
  onCompleteMeeting,
  leadId,
  className = "",
}: MeetingsContainerProps) {
  const { data: session } = useSession();

  // Debounce filters to prevent excessive API calls - only search is debounced
  const debouncedSearch = useDebouncedValue(
    filters.search,
    300 // 300ms debounce
  );

  // Create debounced filters object for API calls
  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  // Memoize query key with debounced filters
  const queryKey = useMemo(
    () => ["meetings", debouncedFilters, sort, leadId],
    [debouncedFilters, sort, leadId]
  );

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status: queryStatus,
  } = useInfiniteQuery<MeetingsResponse>({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const url = new URL("/api/meetings", window.location.origin);
      if (pageParam) {
        url.searchParams.set("cursor", pageParam.toString());
      }
      url.searchParams.set("limit", "20"); // 20 items per page

      // Add leadId if provided
      if (leadId) {
        url.searchParams.set("leadId", leadId.toString());
      }

      // Add filter parameters to API request using debounced filters
      if (debouncedFilters.status !== "all") {
        url.searchParams.set("status", debouncedFilters.status);
      }
      if (debouncedFilters.type !== "all") {
        url.searchParams.set("type", debouncedFilters.type);
      }
      if (debouncedFilters.priority !== "all") {
        url.searchParams.set("priority", debouncedFilters.priority);
      }
      if (debouncedFilters.dateRange !== "all") {
        url.searchParams.set("dateRange", debouncedFilters.dateRange);
      }
      if (debouncedFilters.search.trim()) {
        url.searchParams.set("search", debouncedFilters.search.trim());
      }
      if (debouncedFilters.includeDeleted) {
        url.searchParams.set("includeDeleted", "true");
      }

      // Add sort parameters to API request
      url.searchParams.set("sortField", sort.field);
      url.searchParams.set("sortDirection", sort.direction);

      const response = await fetch(url.toString(), { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to fetch meetings (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch meetings");
      }

      return result.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    enabled: !!session,
    staleTime: 0, // Always fetch fresh data - no caching delays
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: false,
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Flatten all pages into a single array
  const allMeetings = useMemo(
    () => data?.pages?.flatMap((page) => page.meetings) ?? [],
    [data]
  );

  if (queryStatus === "pending") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading meetings...</span>
        </CardContent>
      </Card>
    );
  }

  if (queryStatus === "error") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {error?.message || "Failed to load meetings"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`h-full ${className}`}>
      <MeetingsTable
        meetings={allMeetings}
        hasNextPage={hasNextPage || false}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEditMeeting={onEditMeeting}
        onDeleteMeeting={onDeleteMeeting}
        onCompleteMeeting={onCompleteMeeting}
        isLoading={isFetching}
      />
    </div>
  );
});

export default MeetingsContainer;
