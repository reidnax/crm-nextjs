"use client";

import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MeetingsContainer from "@/components/meetings/MeetingsContainer";
import MeetingHeaderCompact, {
  MeetingFilterState,
  MeetingSortState,
  MeetingAnalytics,
} from "@/components/meetings/MeetingHeaderCompact";
import MeetingDialog from "@/components/dialogs/meeting-dialog";
import { Meeting } from "@/components/meetings/MeetingsTable";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ErrorBoundary, {
  SimpleErrorFallback,
} from "@/components/ui/error-boundary";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { isAdminRole } from "@/lib/permissions";

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isEditMeetingDialogOpen, setIsEditMeetingDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    meeting?: Meeting;
  }>({ isOpen: false });

  // Filter and sorting state
  const [filters, setFilters] = useState<MeetingFilterState>({
    search: "",
    status: "all",
    type: "all",
    priority: "all",
    dateRange: "all",
    includeDeleted: false,
  });
  const [sort, setSort] = useState<MeetingSortState>({
    field: "startTime",
    direction: "asc",
  });

  // Analytics query for meeting statistics
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery<MeetingAnalytics, Error>({
    queryKey: ["meetings", "analytics"],
    queryFn: async () => {
      const response = await fetch("/api/meetings/analytics", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch meeting analytics");
      }

      return result.data;
    },
    enabled: !!session,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Meeting action handlers
  const handleEditMeeting = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
    setIsEditMeetingDialogOpen(true);
  }, []);

  const handleDeleteMeeting = useCallback((meeting: Meeting) => {
    setDeleteDialog({ isOpen: true, meeting });
  }, []);

  const confirmDeleteMeeting = useCallback(async () => {
    if (!deleteDialog.meeting) return;

    try {
      const response = await fetch(`/api/meetings/${deleteDialog.meeting.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete meeting");
      }

      toast.success("Meeting deleted successfully");
      setDeleteDialog({ isOpen: false });

      // Invalidate meetings queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    }
  }, [deleteDialog.meeting, queryClient]);

  const handleCompleteMeeting = useCallback(
    async (meeting: Meeting) => {
      try {
        const newStatus =
          meeting.status === "Completed" ? "Scheduled" : "Completed";

        const response = await fetch(`/api/meetings/${meeting.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...meeting,
            status: newStatus,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update meeting");
        }

        toast.success(`Meeting marked as ${newStatus.toLowerCase()}`);

        // Invalidate meetings queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ["meetings"] });
      } catch (error) {
        console.error("Error updating meeting:", error);
        toast.error("Failed to update meeting");
      }
    },
    [queryClient]
  );

  const handleFilterChange = useCallback(
    (key: keyof MeetingFilterState, value: string | boolean) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSortChange = useCallback((field: string) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      priority: "all",
      dateRange: "all",
      includeDeleted: false,
    });
    setSort({
      field: "startTime",
      direction: "asc",
    });
  }, []);

  const handleCloseEditMeetingDialog = useCallback(() => {
    setEditingMeeting(null);
    setIsEditMeetingDialogOpen(false);
  }, []);

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["meetings"] });
  }, [queryClient]);

  const handleMeetingCreated = useCallback(() => {
    invalidateQueries();
  }, [invalidateQueries]);

  const handleMeetingUpdated = useCallback(() => {
    invalidateQueries();
  }, [invalidateQueries]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="flex-shrink-0">
        <MeetingHeaderCompact
          filters={filters}
          sort={sort}
          analytics={analytics}
          isAnalyticsLoading={analyticsLoading}
          analyticsError={analyticsError}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          onAddMeeting={() => setIsMeetingDialogOpen(true)}
          isAdmin={isAdminRole(session?.user?.role)}
        />
      </div>

      {/* Meetings Container - Take remaining height */}
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
        <ErrorBoundary fallback={SimpleErrorFallback}>
          <MeetingsContainer
            filters={filters}
            sort={sort}
            onEditMeeting={handleEditMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            onCompleteMeeting={handleCompleteMeeting}
          />
        </ErrorBoundary>
      </div>

      {/* Meeting Dialog for creating new meetings */}
      <MeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => setIsMeetingDialogOpen(false)}
        onMeetingCreated={handleMeetingCreated}
      />

      {/* Edit Meeting Dialog */}
      {editingMeeting && (
        <MeetingDialog
          isOpen={isEditMeetingDialogOpen}
          onClose={handleCloseEditMeetingDialog}
          onMeetingUpdated={handleMeetingUpdated}
          initialData={{
            id: editingMeeting.id,
            subject: editingMeeting.subject,
            description: editingMeeting.description || "",
            startTime: editingMeeting.startTime,
            endTime: editingMeeting.endTime,
            location: editingMeeting.location || "",
            type: editingMeeting.type as
              | "Meeting"
              | "Call"
              | "Video Call"
              | "Demo"
              | undefined,
            status: editingMeeting.status as
              | "Scheduled"
              | "Completed"
              | "In Progress"
              | "Cancelled"
              | undefined,
            priority: editingMeeting.priority as
              | "Medium"
              | "High"
              | "Low"
              | undefined,
            agenda: editingMeeting.agenda || "",
            outcome: editingMeeting.outcome || "",
            attendees: editingMeeting.attendees || [],
            isRecurring: editingMeeting.isRecurring || false,
            leadId: editingMeeting.lead.id,
          }}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}
        onConfirm={confirmDeleteMeeting}
        title="Delete Meeting"
        description={
          deleteDialog.meeting
            ? `Are you sure you want to delete "${deleteDialog.meeting.subject}"? This action cannot be undone.`
            : ""
        }
      />
    </div>
  );
}
