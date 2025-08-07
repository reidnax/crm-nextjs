"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MeetingDialog from "@/components/dialogs/meeting-dialog";
import TaskDialog from "@/components/dialogs/task-dialog";
import NoteDialog from "@/components/dialogs/note-dialog";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  FileText,
  Phone,
  Mail,
  Building,
  Edit,
  MoreHorizontal,
  Plus,
  Star,
  Clock,
  User,
  MapPin,
  Check,
  PinIcon,
} from "lucide-react";
import Link from "next/link";
import {
  getStatusColor,
  getSubStatusColor,
  getPriorityColor,
} from "@/lib/utils";
import {
  StatusDropdown,
  SubStatusDropdown,
  PriorityDropdown,
  LeadScoreInput,
  AssigneeDropdown,
} from "@/components/leads/lead-field-dropdowns";

interface DealerData {
  evBusiness?: string;
  evBusinessStatus?: string;
  longTermGoals?: string;
  achieveAvoid?: string;
  goalBarrier?: string;
  problems?: string[];
  improvementInterest?: string;
}

interface SocialMediaData {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  company?: string;
  businessCategory?: string;
  businessIndustry?: string;
  status?: string;
  subStatus?: string;
  convertedStatus?: string;
  priority?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  website?: string;
  description?: string;
  designation?: string;
  annualRevenue?: number;
  investmentLimit?: number;
  source?: string;
  tags?: string[];
  dealer?: DealerData;
  socialMedia?: SocialMediaData;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  leadScore?: number;
  isArchived?: boolean;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    name: string;
    username: string;
  };
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
}

interface Meeting {
  id: number;
  subject: string;
  description?: string;
  startTime: string;
  endTime: string;
  status?: string;
  type?: string;
  location?: string;
  creator?: {
    id: number;
    name: string;
    username: string;
  };
}

interface Task {
  id: number;
  subject: string;
  description?: string;
  dueDate: string;
  status?: string;
  priority?: string;
  creator?: {
    id: number;
    name: string;
    username: string;
  };
}

interface Note {
  id: number;
  subject: string;
  description: string;
  type?: string;
  isPinned?: boolean;
  createdAt: string;
  creator?: {
    id: number;
    name: string;
    username: string;
  };
}

export default function LeadDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  // Simple states
  const [isFavorited, setIsFavorited] = useState(false);
  const [updatingFields, setUpdatingFields] = useState<string[]>([]);

  const fetchLeadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${leadId}`);
      const result = await response.json();

      if (result.success) {
        setLead(result.data);
        // Set the related data from the API response
        setMeetings(result.data.meetings || []);
        setTasks(result.data.tasks || []);
        setNotes(result.data.notes || []);
      } else {
        console.error("Failed to fetch lead details:", result.error);
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Simple handler functions
  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    // TODO: Implement API call to save favorite status
  };

  const handleContactAction = (type: "phone" | "email", value: string) => {
    if (type === "phone") {
      window.open(`tel:${value}`);
    } else if (type === "email") {
      window.open(`mailto:${value}`);
    }
  };

  // Function to handle lead field updates
  const handleLeadUpdate = useCallback(
    async (field: string, value: any) => {
      if (!lead) return;

      // Add field to updating state
      setUpdatingFields((prev) => [...prev, field]);

      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [field]: value }),
        });

        const result = await response.json();

        if (result.success) {
          // Update local state with the updated lead
          setLead((prev) => (prev ? { ...prev, [field]: value } : null));

          // If updating assignee, we need to update the assignee object too
          if (field === "assign" && result.data.assignee) {
            setLead((prev) =>
              prev ? { ...prev, assignee: result.data.assignee } : null
            );
          }
        } else {
          console.error(`Failed to update ${field}:`, result.error);
        }
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
      } finally {
        // Remove field from updating state
        setUpdatingFields((prev) => prev.filter((f) => f !== field));
      }
    },
    [lead, leadId]
  );

  useEffect(() => {
    if (session && leadId) {
      fetchLeadDetails();
    }
  }, [session, leadId, fetchLeadDetails]);

  if (status === "loading" || loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  if (!lead) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lead Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The lead you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/leads">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Lead Info */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-500 text-white text-lg font-medium">
                {lead.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {lead.name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleToggleFavorite}
                >
                  <Star
                    className={`h-4 w-4 ${
                      isFavorited ? "fill-yellow-400 text-yellow-400" : ""
                    }`}
                  />
                </Button>
              </div>
              <div className="space-y-1">
                {lead.company && (
                  <div className="flex items-center text-gray-600">
                    <Building className="h-4 w-4 mr-2" />
                    <span>{lead.company}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <button
                      onClick={() => handleContactAction("email", lead.email!)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {lead.email}
                    </button>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <button
                      onClick={() => handleContactAction("phone", lead.phone!)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {lead.phone}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <StatusDropdown
                  currentStatus={lead.status}
                  onStatusChange={(status) =>
                    handleLeadUpdate("status", status)
                  }
                  isUpdating={updatingFields.includes("status")}
                />

                <SubStatusDropdown
                  currentSubStatus={lead.subStatus}
                  onSubStatusChange={(subStatus) =>
                    handleLeadUpdate("subStatus", subStatus)
                  }
                  isUpdating={updatingFields.includes("subStatus")}
                />

                <PriorityDropdown
                  currentPriority={lead.priority}
                  onPriorityChange={(priority) =>
                    handleLeadUpdate("priority", priority)
                  }
                  isUpdating={updatingFields.includes("priority")}
                />

                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Score:</span>
                  <LeadScoreInput
                    currentScore={lead.leadScore}
                    onScoreChange={(score) =>
                      handleLeadUpdate("leadScore", score)
                    }
                    isUpdating={updatingFields.includes("leadScore")}
                  />
                </div>

                {lead.source && (
                  <Badge variant="secondary">Source: {lead.source}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href={`/leads/${lead.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Lead
              </Button>
            </Link>
            <Button onClick={() => setIsMeetingDialogOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 sm:hidden"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Lead Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-gray-900">
                        {lead.email || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="text-gray-900">
                        {lead.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Company
                      </label>
                      <p className="text-gray-900">
                        {lead.company || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Website
                      </label>
                      <p className="text-gray-900">
                        {lead.website || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Alternate Phone
                      </label>
                      <p className="text-gray-900">
                        {lead.alternatePhone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Business Category
                      </label>
                      <p className="text-gray-900">
                        {lead.businessCategory || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Business Industry
                      </label>
                      <p className="text-gray-900">
                        {lead.businessIndustry || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Designation
                      </label>
                      <p className="text-gray-900">
                        {lead.designation || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Annual Revenue
                      </label>
                      <p className="text-gray-900">
                        {lead.annualRevenue || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Investment Limit
                      </label>
                      <p className="text-gray-900">
                        {lead.investmentLimit || "Not provided"}
                      </p>
                    </div>
                    {lead.city && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          City
                        </label>
                        <p className="text-gray-900">{lead.city}</p>
                      </div>
                    )}
                    {lead.state && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          State
                        </label>
                        <p className="text-gray-900">{lead.state}</p>
                      </div>
                    )}
                    {lead.pincode && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Pincode
                        </label>
                        <p className="text-gray-900">{lead.pincode}</p>
                      </div>
                    )}
                  </div>

                  {lead.address && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Address
                      </label>
                      <p className="text-gray-900">{lead.address}</p>
                    </div>
                  )}

                  {/* Contact Dates */}
                  {(lead.lastContactDate || lead.nextFollowUpDate) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {lead.lastContactDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Last Contact
                          </label>
                          <p className="text-gray-900">
                            {new Date(
                              lead.lastContactDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {lead.nextFollowUpDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Next Follow-up
                          </label>
                          <p className="text-gray-900">
                            {new Date(
                              lead.nextFollowUpDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lead.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Media */}
                  {lead.socialMedia &&
                    Object.values(lead.socialMedia).some((value) => value) && (
                      <div className="pt-4 border-t">
                        <label className="text-sm font-medium text-gray-500">
                          Social Media
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          {lead.socialMedia.linkedin && (
                            <div>
                              <span className="text-xs text-gray-500">
                                LinkedIn:
                              </span>
                              <p className="text-sm text-blue-600 hover:underline">
                                <a
                                  href={lead.socialMedia.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {lead.socialMedia.linkedin}
                                </a>
                              </p>
                            </div>
                          )}
                          {lead.socialMedia.twitter && (
                            <div>
                              <span className="text-xs text-gray-500">
                                Twitter:
                              </span>
                              <p className="text-sm text-blue-600 hover:underline">
                                <a
                                  href={lead.socialMedia.twitter}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {lead.socialMedia.twitter}
                                </a>
                              </p>
                            </div>
                          )}
                          {lead.socialMedia.facebook && (
                            <div>
                              <span className="text-xs text-gray-500">
                                Facebook:
                              </span>
                              <p className="text-sm text-blue-600 hover:underline">
                                <a
                                  href={lead.socialMedia.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {lead.socialMedia.facebook}
                                </a>
                              </p>
                            </div>
                          )}
                          {lead.socialMedia.instagram && (
                            <div>
                              <span className="text-xs text-gray-500">
                                Instagram:
                              </span>
                              <p className="text-sm text-blue-600 hover:underline">
                                <a
                                  href={lead.socialMedia.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {lead.socialMedia.instagram}
                                </a>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {lead.description && (
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500">
                        Description
                      </label>
                      <p className="text-gray-900 mt-1">{lead.description}</p>
                    </div>
                  )}

                  {/* Dealer Information */}
                  {lead.dealer && Object.keys(lead.dealer).length > 0 && (
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500">
                        Dealer Information
                      </label>
                      <div className="mt-2 space-y-3">
                        {lead.dealer.evBusiness && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Current EV Business:
                            </span>
                            <p className="text-sm text-gray-900">
                              {lead.dealer.evBusiness}
                            </p>
                          </div>
                        )}
                        {lead.dealer.evBusinessStatus && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              EV Business Status:
                            </span>
                            <p className="text-sm text-gray-900">
                              {lead.dealer.evBusinessStatus}
                            </p>
                          </div>
                        )}
                        {lead.dealer.longTermGoals && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Long-term Goals:
                            </span>
                            <p className="text-sm text-gray-900">
                              {lead.dealer.longTermGoals}
                            </p>
                          </div>
                        )}
                        {lead.dealer.problems &&
                          lead.dealer.problems.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                Current Problems:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lead.dealer.problems.map((problem, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {problem}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest interactions with this lead
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Total Meetings
                    </span>
                    <span className="text-2xl font-bold">
                      {meetings.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Open Tasks
                    </span>
                    <span className="text-2xl font-bold">{tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Notes
                    </span>
                    <span className="text-2xl font-bold">{notes.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Created By
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-gray-500 text-white text-xs">
                          {lead.creator?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900">
                        {lead.creator?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Assigned To
                    </label>
                    <div className="mt-1">
                      <AssigneeDropdown
                        currentAssigneeId={lead.assignee?.id}
                        currentAssigneeName={lead.assignee?.name}
                        onAssigneeChange={(assigneeId) =>
                          handleLeadUpdate("assign", assigneeId)
                        }
                        isUpdating={updatingFields.includes("assign")}
                        className="justify-start pl-0"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Created: {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      Updated: {new Date(lead.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meetings</CardTitle>
                  <CardDescription>
                    All meetings related to this lead
                  </CardDescription>
                </div>
                <Button onClick={() => setIsMeetingDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No meetings scheduled</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsMeetingDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule First Meeting
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {meeting.subject}
                          </h3>
                          {meeting.description && (
                            <p className="text-gray-600 text-sm mt-1">
                              {meeting.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(meeting.startTime).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(meeting.startTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                              {" - "}
                              {new Date(meeting.endTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {meeting.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {meeting.status && (
                            <Badge
                              variant={
                                meeting.status === "Completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {meeting.status}
                            </Badge>
                          )}
                          {meeting.type && (
                            <Badge variant="outline">{meeting.type}</Badge>
                          )}
                        </div>
                      </div>
                      {meeting.creator && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          Created by {meeting.creator.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>
                    All tasks related to this lead
                  </CardDescription>
                </div>
                <Button onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No tasks created</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsTaskDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                task.status === "Completed"
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                              onClick={() => {
                                // TODO: Toggle task completion
                                console.log(
                                  "Toggle task completion for task:",
                                  task.id
                                );
                              }}
                            >
                              {task.status === "Completed" && (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <h3
                              className={`font-semibold ${
                                task.status === "Completed"
                                  ? "text-gray-500 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {task.subject}
                            </h3>
                          </div>
                          {task.description && (
                            <p className="text-gray-600 text-sm mt-1 ml-7">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 ml-7 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                            {task.priority && (
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    task.priority === "High"
                                      ? "bg-red-500"
                                      : task.priority === "Medium"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                ></span>
                                {task.priority} Priority
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status && (
                            <Badge
                              variant={
                                task.status === "Completed"
                                  ? "default"
                                  : task.status === "In Progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {task.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.creator && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          Created by {task.creator.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>All notes about this lead</CardDescription>
                </div>
                <Button onClick={() => setIsNoteDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No notes added</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsNoteDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {note.subject}
                            </h3>
                            {note.isPinned && (
                              <PinIcon className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-gray-700 text-sm mt-2 whitespace-pre-wrap">
                            {note.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(note.createdAt).toLocaleDateString()}
                            </div>
                            {note.type && note.type !== "General" && (
                              <Badge variant="outline" className="text-xs">
                                {note.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // TODO: Toggle note pin status
                              console.log("Toggle pin for note:", note.id);
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              note.isPinned
                                ? "text-yellow-500"
                                : "text-gray-400"
                            }`}
                          >
                            <PinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {note.creator && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          Created by {note.creator.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reusable Dialogs */}
      <MeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => setIsMeetingDialogOpen(false)}
        onSuccess={fetchLeadDetails}
        leadId={leadId}
      />

      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        onSuccess={fetchLeadDetails}
        leadId={leadId}
      />

      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSuccess={fetchLeadDetails}
        leadId={leadId}
      />
    </div>
  );
}
