"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import MeetingCard from "./MeetingCard";
import { Meeting } from "./MeetingsTable";
import MeetingDialog from "@/components/dialogs/meeting-dialog";

interface LeadMeetingsProps {
  leadId: number;
  leadName?: string;
  leadCompany?: string;
  className?: string;
  maxHeight?: string;
}

export default function LeadMeetings({
  leadId,
  leadName = "Lead",
  leadCompany,
  className = "",
  maxHeight = "600px",
}: LeadMeetingsProps) {
  // State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [meetingDialog, setMeetingDialog] = useState<{
    isOpen: boolean;
    meeting?: Meeting;
  }>({ isOpen: false });

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    meeting?: Meeting;
  }>({ isOpen: false });

  // Fetch meetings for this lead
  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}/meetings`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch meetings");
      }

      const data = await response.json();

      // Transform meetings to include lead information since MeetingCard expects it
      const meetingsWithLead = data.data.map((meeting: any) => ({
        ...meeting,
        lead: {
          id: leadId,
          name: leadName,
          company: leadCompany || meeting.lead?.company || null, // Use passed company or API response
        },
      }));

      setMeetings(meetingsWithLead);
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setError(err instanceof Error ? err.message : "Failed to load meetings");
    } finally {
      setIsLoading(false);
    }
  }, [leadId, leadName, leadCompany]);

  // Meeting actions
  const handleCreateMeeting = () => {
    setMeetingDialog({ isOpen: true });
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setMeetingDialog({
      isOpen: true,
      meeting: {
        ...meeting,
        startTime: new Date(meeting.startTime).toISOString().slice(0, 16),
        endTime: new Date(meeting.endTime).toISOString().slice(0, 16),
      },
    });
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    setDeleteDialog({ isOpen: true, meeting });
  };

  const handleCompleteMeeting = async (meeting: Meeting) => {
    try {
      const newStatus =
        meeting.status === "Completed" ? "Scheduled" : "Completed";

      const response = await fetch(
        `/api/leads/${leadId}/meetings/${meeting.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...meeting,
            status: newStatus,
            ...(newStatus === "Completed"
              ? { outcome: meeting.outcome || "Meeting completed" }
              : {}),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update meeting");
      }

      const result = await response.json();
      const updatedMeeting = result.data;

      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? updatedMeeting : m))
      );

      toast.success(`Meeting marked as ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast.error("Failed to update meeting");
    }
  };

  const confirmDelete = async () => {
    const meeting = deleteDialog.meeting;
    if (!meeting) return;

    try {
      const response = await fetch(
        `/api/leads/${leadId}/meetings/${meeting.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete meeting");
      }

      setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
      toast.success("Meeting deleted successfully");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    } finally {
      setDeleteDialog({ isOpen: false });
    }
  };

  // Dialog handlers
  const handleMeetingCreated = (meeting: Meeting) => {
    // Ensure the meeting has proper lead information
    const meetingWithLead = {
      ...meeting,
      lead: {
        id: leadId,
        name: leadName,
        company: leadCompany || meeting.lead?.company || null,
      },
    };
    setMeetings((prev) => [meetingWithLead, ...prev]);
    setMeetingDialog({ isOpen: false });
  };

  const handleMeetingUpdated = (meeting: Meeting) => {
    // Ensure the meeting has proper lead information
    const meetingWithLead = {
      ...meeting,
      lead: {
        id: leadId,
        name: leadName,
        company: leadCompany || meeting.lead?.company || null,
      },
    };
    setMeetings((prev) =>
      prev.map((m) => (m.id === meeting.id ? meetingWithLead : m))
    );
    setMeetingDialog({ isOpen: false });
  };

  // Effects
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Calculate stats
  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(
    (m) => m.status === "Completed"
  ).length;
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.startTime) >= new Date() && m.status === "Scheduled"
  ).length;
  const overdueScheduledMeetings = meetings.filter(
    (m) => new Date(m.startTime) < new Date() && m.status === "Scheduled"
  ).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meetings ({totalMeetings})
          </CardTitle>
          <Button
            onClick={handleCreateMeeting}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Meeting
          </Button>
        </div>

        {/* Quick Stats */}
        {totalMeetings > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{completedMeetings} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{upcomingMeetings} upcoming</span>
            </div>
            {overdueScheduledMeetings > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>{overdueScheduledMeetings} overdue</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading meetings...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchMeetings} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalMeetings === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">
              No meetings scheduled for {leadName}
            </p>
            <Button onClick={handleCreateMeeting} variant="outline">
              Schedule First Meeting
            </Button>
          </div>
        )}

        {/* Meetings List */}
        {!isLoading && !error && totalMeetings > 0 && (
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight }}>
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onComplete={handleCompleteMeeting}
                onEdit={handleEditMeeting}
                onDelete={handleDeleteMeeting}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Meeting Dialog */}
      <MeetingDialog
        isOpen={meetingDialog.isOpen}
        onClose={() => setMeetingDialog({ isOpen: false })}
        onMeetingCreated={handleMeetingCreated}
        onMeetingUpdated={handleMeetingUpdated}
        initialData={meetingDialog.meeting}
        leadId={leadId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.meeting?.subject}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
