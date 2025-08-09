"use client";

import { memo } from "react";
import MeetingCard from "./MeetingCard";
import { Meeting } from "./MeetingsTable";
import { Calendar, Loader2 } from "lucide-react";

interface MeetingListProps {
  meetings: Meeting[];
  onToggleMeetingCompletion: (meeting: Meeting) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meeting: Meeting) => void;
  isLoading?: boolean;
  className?: string;
  emptyMessage?: string;
}

const MeetingList = memo(function MeetingList({
  meetings,
  onToggleMeetingCompletion,
  onEditMeeting,
  onDeleteMeeting,
  isLoading = false,
  className = "",
  emptyMessage = "No meetings found",
}: MeetingListProps) {
  if (isLoading) {
    return (
      <div className={`h-full ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading meetings...</span>
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className={`h-full ${className}`}>
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Calendar className="h-8 w-8 mr-2" />
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          onComplete={onToggleMeetingCompletion}
          onEdit={onEditMeeting}
          onDelete={onDeleteMeeting}
        />
      ))}
    </div>
  );
});

export default MeetingList;
