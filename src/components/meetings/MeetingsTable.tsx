"use client";

import { useEffect, useRef, memo } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import MeetingCard from "./MeetingCard";

export interface Meeting {
  id: number;
  subject: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  type?: string;
  priority?: string;
  location?: string;
  agenda?: string;
  outcome?: string;
  attendees?: string[] | null;
  isRecurring?: boolean;
  reminderSent?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  deletedBy?: number;
  lead: {
    id: number;
    name: string;
    company?: string;
  };
  creator?: {
    id: number;
    name: string;
    username: string;
  };
}

interface MeetingsTableProps {
  meetings: Meeting[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onEditMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meeting: Meeting) => void;
  onCompleteMeeting: (meeting: Meeting) => void;
  isLoading?: boolean;
  className?: string;
}

const MeetingsTable = memo(function MeetingsTable({
  meetings,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onEditMeeting,
  onDeleteMeeting,
  onCompleteMeeting,
  isLoading = false,
  className = "",
}: MeetingsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? meetings.length + 1 : meetings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 230, // Increased for better mobile/desktop spacing
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  // Proper infinite scroll detection for virtual scrolling
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      // Get virtual scroller metrics
      const totalSize = rowVirtualizer.getTotalSize();
      const { scrollTop, clientHeight } = scrollElement;

      // Calculate how much content is left to scroll
      const scrollableDistance = totalSize - clientHeight;
      const scrollProgress =
        scrollableDistance > 0 ? scrollTop / scrollableDistance : 1;

      // Trigger fetch when 80% scrolled through the virtual content
      if (scrollProgress >= 0.8 && hasNextPage && !isFetchingNextPage) {
        onFetchNextPage();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
    rowVirtualizer,
    meetings.length,
  ]);

  if (isLoading) {
    return (
      <div ref={containerRef} className={`h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading meetings...</span>
        </div>
      </div>
    );
  }

  if (meetings.length === 0 && !hasNextPage) {
    return (
      <div ref={containerRef} className={`h-full ${className}`}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <Calendar className="h-8 w-8 mr-2" />
          <span>No meetings found</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full ${className}`}>
      <div
        ref={parentRef}
        className="overflow-auto h-full"
        style={{
          contain: "strict",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index > meetings.length - 1;
            const meeting = meetings[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: `${virtualRow.start}px`,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                }}
              >
                {isLoaderRow ? (
                  hasNextPage ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading more meetings...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 text-gray-500">
                      <Calendar className="h-5 w-5 mr-2" />
                      No more meetings to load
                    </div>
                  )
                ) : (
                  <div className="p-1 sm:p-2">
                    <MeetingCard
                      meeting={meeting}
                      onEdit={onEditMeeting}
                      onDelete={onDeleteMeeting}
                      onComplete={onCompleteMeeting}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default MeetingsTable;
