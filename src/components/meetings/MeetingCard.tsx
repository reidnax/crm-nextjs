"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Building,
  Edit,
  Trash2,
  Check,
  AlertCircle,
  Users,
  FileText,
  Target,
  Repeat,
} from "lucide-react";
import { Meeting } from "./MeetingsTable";
import {
  getMeetingStatusColor,
  getPriorityColor,
  formatDate,
} from "@/lib/utils";

interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
  onComplete: (meeting: Meeting) => void;
}

const MeetingCard = memo(function MeetingCard({
  meeting,
  onEdit,
  onDelete,
  onComplete,
}: MeetingCardProps) {
  const isCompleted = meeting.status === "Completed";
  const isCancelled = meeting.status === "Cancelled";
  const isDeleted = !!meeting.deletedAt;
  const startTime = new Date(meeting.startTime);
  const endTime = new Date(meeting.endTime);
  const isOverdue = startTime < new Date() && !isCompleted && !isCancelled;
  const isToday = startTime.toDateString() === new Date().toDateString();

  // Determine card styling based on status
  const cardClasses = isDeleted
    ? "group transition-all duration-200 border-l-4 border-l-red-500 bg-red-50 opacity-75"
    : "group hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 border-l-4 border-l-gray-200 hover:border-l-blue-400";

  return (
    <Card className={cardClasses}>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Header Row - Title, Status, Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Completion Checkbox */}
              <button
                onClick={() => onComplete(meeting)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                }`}
                title={isCompleted ? "Mark as scheduled" : "Mark as completed"}
              >
                {isCompleted && <Check className="h-3 w-3" />}
              </button>

              <div className="flex-1 min-w-0">
                {/* Meeting Title */}
                <h3
                  className={`font-semibold text-sm sm:text-base leading-tight ${
                    isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                >
                  {meeting.subject}
                </h3>

                {/* Quick indicators - moved below title on mobile */}
                <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                  {meeting.isRecurring && (
                    <div
                      className="p-0.5 rounded bg-blue-100 text-blue-600"
                      title="Recurring Meeting"
                    >
                      <Repeat className="h-3 w-3" />
                    </div>
                  )}
                  {isOverdue && (
                    <div
                      className="p-0.5 rounded bg-red-100 text-red-600"
                      title="Overdue"
                    >
                      <AlertCircle className="h-3 w-3" />
                    </div>
                  )}
                  {isToday && !isOverdue && (
                    <div
                      className="p-0.5 rounded bg-yellow-100 text-yellow-600"
                      title="Today"
                    >
                      <Clock className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>

              {/* Quick indicators - desktop */}
              <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                {meeting.isRecurring && (
                  <div
                    className="p-0.5 rounded bg-blue-100 text-blue-600"
                    title="Recurring Meeting"
                  >
                    <Repeat className="h-3 w-3" />
                  </div>
                )}
                {isOverdue && (
                  <div
                    className="p-0.5 rounded bg-red-100 text-red-600"
                    title="Overdue"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}
                {isToday && !isOverdue && (
                  <div
                    className="p-0.5 rounded bg-yellow-100 text-yellow-600"
                    title="Today"
                  >
                    <Clock className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Status and Priority badges */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
              {isDeleted && (
                <Badge
                  variant="outline"
                  className="text-xs bg-red-100 text-red-700 border-red-300"
                >
                  DELETED
                </Badge>
              )}
              {meeting.status && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getMeetingStatusColor(meeting.status)}`}
                >
                  {meeting.status}
                </Badge>
              )}
              {meeting.priority && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getPriorityColor(meeting.priority)}`}
                >
                  {meeting.priority}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {meeting.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {meeting.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Date */}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {formatDate(startTime)}
                  {isToday && (
                    <span className="ml-1 text-blue-600 font-semibold">
                      (Today)
                    </span>
                  )}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="ml-1 text-gray-500">
                    ({meeting.duration}m)
                  </span>
                </span>
              </div>

              {/* Lead */}
              <div className="flex items-center gap-1 min-w-0">
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                {meeting.lead ? (
                  <Link
                    href={`/leads/${meeting.lead.id}`}
                    className="text-blue-600 hover:underline max-w-24 sm:max-w-32 truncate"
                    title={`${meeting.lead.name}${
                      meeting.lead.company ? ` (${meeting.lead.company})` : ""
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {meeting.lead.name}
                  </Link>
                ) : (
                  <span className="text-gray-500 truncate">
                    No lead assigned
                  </span>
                )}
              </div>

              {/* Type */}
              {meeting.type && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0 hidden sm:inline-flex"
                >
                  {meeting.type}
                </Badge>
              )}
            </div>

            {/* Action Buttons - Hidden for deleted items */}
            {!isDeleted && (
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(meeting)}
                  className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                  title="Edit meeting"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(meeting)}
                  className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                  title="Delete meeting"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile-only additional info */}
          <div className="sm:hidden flex items-center gap-3 text-xs text-gray-500">
            {/* Type on mobile */}
            {meeting.type && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {meeting.type}
              </Badge>
            )}
          </div>

          {/* Location Row */}
          {meeting.location && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              <span className="truncate">{meeting.location}</span>
            </div>
          )}

          {/* Agenda/Outcome Row */}
          {(meeting.agenda || meeting.outcome) && (
            <div className="space-y-1">
              {meeting.agenda && (
                <div className="flex items-start gap-1.5 text-xs sm:text-sm text-gray-600">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Agenda: </span>
                    <span className="line-clamp-2">{meeting.agenda}</span>
                  </div>
                </div>
              )}
              {meeting.outcome && (
                <div className="flex items-start gap-1.5 text-xs sm:text-sm text-gray-600">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Outcome: </span>
                    <span className="line-clamp-2">{meeting.outcome}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendees Row */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
              <span className="truncate">
                {meeting.attendees.slice(0, 3).join(", ")}
                {meeting.attendees.length > 3 && (
                  <span className="text-gray-500">
                    {" "}
                    +{meeting.attendees.length - 3} more
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Creator Info */}
          {meeting.creator && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span>
                {meeting.creator.name}
                {meeting.updatedAt && (
                  <span className="ml-1">
                    • {formatDate(meeting.updatedAt)}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default MeetingCard;
