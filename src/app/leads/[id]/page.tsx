"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MeetingDialog from "@/components/dialogs/meeting-dialog";
import TaskDialog from "@/components/dialogs/task-dialog";
import NoteDialog from "@/components/dialogs/note-dialog";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Plus,
  Clock,
  PinIcon,
  MapPin,
  User,
  CheckSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

import TaskList from "@/components/tasks/TaskList";
import LeadMeetings from "@/components/meetings/LeadMeetings";
// LeadScoreInput is used in the LeadHeaderCompact component
import LeadDetailHeader from "@/components/leads/LeadDetailHeader";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

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
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: number;
  reminderDate?: string;
  tags?: string[];
  isRecurring?: boolean;
  completedAt?: string;
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

function LeadDetailPageContent() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Sort tasks with completed at the bottom
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Completed tasks go to bottom
      if (a.status === "Completed" && b.status !== "Completed") return 1;
      if (a.status !== "Completed" && b.status === "Completed") return -1;

      // Then sort by due date (earlier first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Valid tab names - using useMemo to prevent dependency issues
  const validTabs = useMemo(
    () => ["overview", "meetings", "tasks", "notes"],
    []
  );

  // Get initial tab from URL or default to "overview"
  const getInitialTab = useCallback((): string => {
    const tabParam = searchParams.get("tab");
    return tabParam && validTabs.includes(tabParam) ? tabParam : "overview";
  }, [searchParams, validTabs]);

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Dialog states
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  // Task editing states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task;
  }>({ isOpen: false });

  // Simple states
  const [isFavorited, setIsFavorited] = useState(false);
  const [updatingFields, setUpdatingFields] = useState<string[]>([]);

  // Handle tab changes with URL synchronization
  const handleTabChange = useCallback(
    (newTab: string) => {
      if (!validTabs.includes(newTab)) return;

      setActiveTab(newTab);

      // Update URL with new tab parameter
      const currentUrl = new URL(window.location.href);
      if (newTab === "overview") {
        // Remove tab parameter for overview (default)
        currentUrl.searchParams.delete("tab");
      } else {
        currentUrl.searchParams.set("tab", newTab);
      }

      // Update browser history without triggering a page reload
      router.push(currentUrl.pathname + currentUrl.search, { scroll: false });
    },
    [router, validTabs]
  );

  // Sync tab state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const newTab = getInitialTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams, activeTab, getInitialTab]);

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
    async (field: string, value: unknown) => {
      if (!lead) return;

      // Add field to updating state
      setUpdatingFields((prev) => [...prev, field]);

      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [field]: value }),
        });

        const result = await response.json();

        if (result.success) {
          // Update local state with the complete updated lead from API
          setLead(result.data);
          toast.success(
            `${
              field.charAt(0).toUpperCase() + field.slice(1)
            } updated successfully`
          );
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

  // Task management functions

  // Task management functions
  const handleToggleTaskCompletion = async (task: Task) => {
    try {
      const newStatus = task.status === "Completed" ? "Pending" : "Completed";
      const response = await fetch(`/api/leads/${leadId}/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: newStatus,
                  completedAt: result.data.completedAt,
                }
              : t
          )
        );
      } else {
        console.error("Failed to update task status:", result.error);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    setDeleteTaskDialog({ isOpen: true, task });
  };

  const confirmDeleteTask = async () => {
    if (!deleteTaskDialog.task) return;

    try {
      const response = await fetch(
        `/api/leads/${leadId}/tasks/${deleteTaskDialog.task.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        // Remove task from local state
        setTasks((prev) =>
          prev.filter((t) => t.id !== deleteTaskDialog.task!.id)
        );
        toast.success("Task deleted successfully");
        setDeleteTaskDialog({ isOpen: false });
      } else {
        console.error("Failed to delete task:", result.error);
        toast.error("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleCloseEditTaskDialog = () => {
    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskCreateSuccess = useCallback(() => {
    setIsTaskDialogOpen(false);
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  const handleTaskEditSuccess = useCallback(() => {
    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  const refreshLeadDetailsWithCacheBusting = useCallback(async () => {
    // Refresh the lead details with cache busting to ensure we get updated data
    try {
      const response = await fetch(`/api/leads/${leadId}?t=${Date.now()}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.success) {
        setLead(result.data);
        setMeetings(result.data.meetings || []);
        setTasks(result.data.tasks || []);
        setNotes(result.data.notes || []);
      }
    } catch (error) {
      console.error("Error refreshing lead details:", error);
      // Fallback to the original method
      fetchLeadDetails();
    }
  }, [leadId, fetchLeadDetails]);

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

  // Get the referrer URL to preserve filters when navigating back
  const referrerParams = searchParams.get("ref");
  const leadsHref = referrerParams ? `/leads?${referrerParams}` : "/leads";

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
          <Link href={leadsHref}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Breadcrumb items are now handled in the LeadHeaderCompact component

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Lead Header Component */}
        <LeadDetailHeader
          lead={lead}
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavorite}
          onContactAction={handleContactAction}
          onLeadUpdate={handleLeadUpdate}
          updatingFields={updatingFields}
          leadsHref={leadsHref}
          onScheduleMeeting={() => setIsMeetingDialogOpen(true)}
        />

        {/* Content Container */}
        <div className="p-4 md:p-6 lg:p-8">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-4 md:space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4 h-10 md:h-auto lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger value="overview" className="text-xs md:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="meetings" className="text-xs md:text-sm">
                Meetings
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs md:text-sm">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs md:text-sm">
                Notes
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                  {/* Lead Details */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">
                        Lead Information
                      </CardTitle>
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
                                {formatDate(lead.lastContactDate)}
                              </p>
                            </div>
                          )}
                          {lead.nextFollowUpDate && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Next Follow-up
                              </label>
                              <p className="text-gray-900">
                                {formatDate(lead.nextFollowUpDate)}
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
                        Object.values(lead.socialMedia).some(
                          (value) => value
                        ) && (
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
                          <p className="text-gray-900 mt-1">
                            {lead.description}
                          </p>
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
                                    {lead.dealer.problems.map(
                                      (problem, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {problem}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                      <CardDescription className="text-sm">
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
                <div className="space-y-4 md:space-y-6">
                  {/* Quick Stats */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Quick Stats</CardTitle>
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
                        <span className="text-2xl font-bold">
                          {tasks.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Notes
                        </span>
                        <span className="text-2xl font-bold">
                          {notes.length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assignment */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Assignment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Created By
                        </label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gray-500 text-white text-xs">
                              {lead.creator?.name?.charAt(0).toUpperCase() ||
                                "U"}
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
                        <div className="flex items-center space-x-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gray-500 text-white text-xs">
                              {lead.assignee?.name?.charAt(0).toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-900">
                            {lead.assignee?.name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Created: {formatDate(lead.createdAt)}</div>
                        <div>Updated: {formatDate(lead.updatedAt)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Meetings Tab */}
            <TabsContent value="meetings" className="space-y-4 md:space-y-6">
              {lead && (
                <LeadMeetings
                  leadId={parseInt(leadId)}
                  leadName={lead.name}
                  leadCompany={lead.company}
                  className="shadow-sm"
                />
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4 md:space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      Tasks ({tasks.length})
                    </CardTitle>
                    <Button
                      onClick={() => setIsTaskDialogOpen(true)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  {tasks.length > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          {tasks.filter((t) => t.status === "Completed").length}{" "}
                          completed
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>
                          {tasks.filter((t) => t.status === "Pending").length}{" "}
                          pending
                        </span>
                      </div>
                      {tasks.filter(
                        (t) =>
                          new Date(t.dueDate) < new Date() &&
                          t.status !== "Completed"
                      ).length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>
                            {
                              tasks.filter(
                                (t) =>
                                  new Date(t.dueDate) < new Date() &&
                                  t.status !== "Completed"
                              ).length
                            }{" "}
                            overdue
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <TaskList
                    tasks={sortedTasks.map((task) => ({
                      ...task,
                      lead: {
                        id: lead?.id || 0,
                        name: lead?.name || "Unknown Lead",
                        company: lead?.company,
                      },
                    }))}
                    onToggleTaskCompletion={handleToggleTaskCompletion}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    emptyMessage="No tasks created"
                  />
                  {tasks.length === 0 && (
                    <div className="text-center py-8">
                      <Button
                        variant="outline"
                        onClick={() => setIsTaskDialogOpen(true)}
                        size="sm"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 md:space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Notes</CardTitle>
                      <CardDescription className="text-sm">
                        All notes about this lead
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsNoteDialogOpen(true)}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Add Note</span>
                      <span className="sm:hidden">Add</span>
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
                        size="sm"
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
                                  {formatDate(note.createdAt)}
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
        </div>
      </div>

      {/* Reusable Dialogs */}
      <MeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => setIsMeetingDialogOpen(false)}
        onMeetingCreated={() => {
          fetchLeadDetails();
        }}
        onMeetingUpdated={() => {
          fetchLeadDetails();
        }}
        leadId={parseInt(leadId)}
      />

      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        onSuccess={handleTaskCreateSuccess}
        leadId={leadId}
        initialData={
          lead?.assignee
            ? {
                assignedTo: lead.assignee.id,
              }
            : undefined
        }
      />

      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSuccess={fetchLeadDetails}
        leadId={leadId}
      />

      {/* Edit Task Dialog */}
      <TaskDialog
        isOpen={isEditTaskDialogOpen}
        onClose={handleCloseEditTaskDialog}
        onSuccess={handleTaskEditSuccess}
        leadId={leadId}
        apiEndpoint={
          editingTask
            ? `/api/leads/${leadId}/tasks/${editingTask.id}`
            : undefined
        }
        title="Edit Task"
        description="Update task details and tracking information."
        submitButtonText="Update Task"
        submitButtonLoadingText="Updating..."
        initialData={
          editingTask
            ? {
                subject: editingTask.subject,
                description: editingTask.description,
                dueDate: editingTask.dueDate,
                priority: editingTask.priority,
                status: editingTask.status,
                category: editingTask.category,
                estimatedHours: editingTask.estimatedHours,
                actualHours: editingTask.actualHours,
                assignedTo: editingTask.assignedTo,
                reminderDate: editingTask.reminderDate,
                tags: editingTask.tags,
                isRecurring: editingTask.isRecurring,
              }
            : undefined
        }
        showStatusField={true}
      />

      <DeleteConfirmationDialog
        open={deleteTaskDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteTaskDialog({ isOpen: false })}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        description={
          deleteTaskDialog.task
            ? `Are you sure you want to delete "${deleteTaskDialog.task.subject}"? This action cannot be undone.`
            : ""
        }
      />
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <LeadDetailPageContent />
    </Suspense>
  );
}
