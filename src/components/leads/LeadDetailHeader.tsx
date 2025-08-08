"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Building,
  Calendar,
  Edit,
  Mail,
  MapPin,
  Phone,
  Star,
  Tag,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  StatusDropdown,
  SubStatusDropdown,
  PriorityDropdown,
  AssigneeDropdown,
} from "@/components/leads/lead-field-dropdowns";

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  city?: string;
  state?: string;
  status?: string;
  subStatus?: string;
  priority?: string;
  source?: string;
  leadScore?: number;
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
}

interface LeadDetailHeaderProps {
  lead: Lead;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onContactAction: (type: "phone" | "email", value: string) => void;
  onLeadUpdate: (field: string, value: unknown) => void;
  updatingFields: string[];
  leadsHref: string;
  onScheduleMeeting: () => void;
}

const LeadDetailHeader = memo(function LeadDetailHeader({
  lead,
  isFavorited,
  onToggleFavorite,
  onContactAction,
  onLeadUpdate,
  updatingFields,
  leadsHref,
  onScheduleMeeting,
}: LeadDetailHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Mobile-first Navigation Header */}
      <div className="px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href={leadsHref}>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Leads</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>

          {/* Mobile Quick Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href={`/leads/${lead.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={onScheduleMeeting} size="sm">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Compact Two-liner Header */}
        <div className="mt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          {/* Left Side: Lead Info */}
          <div className="flex items-start gap-3 md:w-1/2">
            <Avatar className="h-12 w-12 ring-2 ring-blue-100 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                {lead.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Name and Favorite */}
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                  {lead.name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-yellow-50 flex-shrink-0"
                  onClick={onToggleFavorite}
                >
                  <Star
                    className={`h-4 w-4 ${
                      isFavorited
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-400"
                    }`}
                  />
                </Button>
              </div>

              {/* Quick Info Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {lead.company && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span className="font-medium truncate">{lead.company}</span>
                  </div>
                )}
                {lead.designation && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{lead.designation}</span>
                  </div>
                )}
                {(lead.city || lead.state) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">
                      {[lead.city, lead.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
                {lead.email && (
                  <button
                    onClick={() => onContactAction("email", lead.email!)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate"
                  >
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </button>
                )}
                {lead.phone && (
                  <button
                    onClick={() => onContactAction("phone", lead.phone!)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {lead.phone}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Status & Assignee */}
          <div className="flex flex-col gap-2 md:w-1/2 md:flex-row md:items-start md:justify-end">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusDropdown
                currentStatus={lead.status}
                onStatusChange={(status) => onLeadUpdate("status", status)}
                isUpdating={updatingFields.includes("status")}
              />
              <SubStatusDropdown
                currentSubStatus={lead.subStatus}
                onSubStatusChange={(subStatus) =>
                  onLeadUpdate("subStatus", subStatus)
                }
                isUpdating={updatingFields.includes("subStatus")}
              />
              <PriorityDropdown
                currentPriority={lead.priority}
                onPriorityChange={(priority) =>
                  onLeadUpdate("priority", priority)
                }
                isUpdating={updatingFields.includes("priority")}
              />
            </div>

            {/* Assignee */}
            <div className="mt-1 md:mt-0">
              <AssigneeDropdown
                currentAssigneeId={lead.assignee?.id}
                currentAssigneeName={lead.assignee?.name}
                onAssigneeChange={(assigneeId) =>
                  onLeadUpdate("assign", assigneeId)
                }
                isUpdating={updatingFields.includes("assign")}
                className="justify-start pl-0"
              />
            </div>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2 mt-3">
          <Link href={`/leads/${lead.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button onClick={onScheduleMeeting} size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          {lead.source && (
            <Badge variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {lead.source}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

LeadDetailHeader.displayName = "LeadDetailHeader";

export default LeadDetailHeader;
