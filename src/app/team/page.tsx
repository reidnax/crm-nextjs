"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
  CheckCircle,
  Shield,
  User,
  Edit3,
  Trash2,
} from "lucide-react";
import AddTeamMemberDialog from "@/components/dialogs/add-team-member-dialog";
import EditTeamMemberDialog from "@/components/dialogs/edit-team-member-dialog";
import { isAdminRole, isAdminRoleVariation } from "@/lib/permissions";
import { PermissionGate } from "@/components/auth/PermissionGate";

import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface TeamMember {
  id: number;
  username: string;
  name?: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  jobTitle?: string;
  bio?: string;
  active: boolean;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  // Stats
  assignedLeads?: number;
  completedTasks?: number;
  scheduledMeetings?: number;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Current user's role for permission checks
  const [currentUserRole, setCurrentUserRole] = useState<string>("user");

  const fetchTeamMembers = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch("/api/team");
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }

      const result = await response.json();
      setTeamMembers(result.data || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchTeamMembers();
      // Get current user's role
      const userRole = session?.user?.role || "user";
      setCurrentUserRole(userRole);
    }
  }, [session, fetchTeamMembers]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/team/export");
      if (!response.ok) {
        throw new Error("Failed to export team data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `team-members-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Team data exported successfully");
    } catch (error) {
      console.error("Error exporting team data:", error);
      toast.error("Failed to export team data");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleDeleteMember = async (memberId: number) => {
    if (!confirm("Are you sure you want to deactivate this team member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete team member");
      }

      await fetchTeamMembers(); // Refresh the list
      toast.success("Team member deactivated successfully");
    } catch (error) {
      console.error("Error deleting team member:", error);
      toast.error("Failed to deactivate team member");
    }
  };

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "admin-dev":
        return "bg-purple-100 text-purple-700";
      case "manager":
        return "bg-blue-100 text-blue-700";
      case "user":
      case "assignee":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "admin-dev":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return "Never";

    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
  };

  const handleToggleActive = async (memberId: number, active: boolean) => {
    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update team member status");
      }

      // Update the local state immediately for better UX
      setTeamMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.id === memberId ? { ...member, active } : member
        )
      );
      toast.success(
        `Team member ${active ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Error updating team member status:", error);
      toast.error("Failed to update team member status");
    }
  };

  if (status === "loading" || loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">
            Manage team members and their access
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button variant="outline" className="sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <PermissionGate permission="users.create">
            <Button
              className="sm:w-auto"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Members
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {teamMembers.length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {teamMembers.filter((m) => m.active).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-purple-600">
                  {
                    new Set(
                      teamMembers.map((m) => m.department).filter(Boolean)
                    ).size
                  }
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    teamMembers.filter((m) => isAdminRoleVariation(m.role))
                      .length
                  }
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Team Members</CardTitle>
              <CardDescription className="mt-1">
                {filteredMembers.length} member
                {filteredMembers.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <PermissionGate permission="team.export">
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

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredMembers.length > 0 ? (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Department
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Performance
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Last Login
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-blue-500 text-white">
                                {getInitials(member.name, member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">
                                {member.name || member.username}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.email}
                              </div>
                              <div className="text-sm text-gray-500 lg:hidden">
                                {member.department} • {member.jobTitle}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getRoleColor(member.role)}
                            variant="secondary"
                          >
                            <span className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {member.role?.charAt(0).toUpperCase() +
                                (member.role?.slice(1) || "")}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-gray-900">
                            {member.department || "-"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.jobTitle || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1 text-sm">
                            <div>Leads: {member.assignedLeads || 0}</div>
                            <div>Tasks: {member.completedTasks || 0}</div>
                            <div>Meetings: {member.scheduledMeetings || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-gray-500">
                          {formatLastLogin(member.lastLoginAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={member.active}
                              onCheckedChange={(checked) =>
                                handleToggleActive(member.id, checked)
                              }
                            />
                            <span className="text-sm text-gray-600">
                              {member.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditMember(member)}
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {member.email && (
                                <DropdownMenuItem asChild>
                                  <a href={`mailto:${member.email}`}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Email
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {member.phone && (
                                <DropdownMenuItem asChild>
                                  <a href={`tel:${member.phone}`}>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Call
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {isAdminRole(currentUserRole) &&
                                member.id !==
                                  parseInt(
                                    (session as any)?.user?.id || "0"
                                  ) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteMember(member.id)
                                      }
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-4 p-4">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="p-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-blue-500 text-white">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {member.name || member.username}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {member.email}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={member.active}
                              onCheckedChange={(checked) =>
                                handleToggleActive(member.id, checked)
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getRoleColor(member.role)}
                              variant="secondary"
                            >
                              <span className="flex items-center gap-1">
                                {getRoleIcon(member.role)}
                                {member.role?.charAt(0).toUpperCase() +
                                  (member.role?.slice(1) || "")}
                              </span>
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {member.active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          {member.department && (
                            <div className="text-sm text-gray-600">
                              {member.department} • {member.jobTitle}
                            </div>
                          )}

                          <div className="text-sm text-gray-600">
                            Last login: {formatLastLogin(member.lastLoginAt)}
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {member.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a href={`mailto:${member.email}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </a>
                            </Button>
                          )}
                          {member.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a href={`tel:${member.phone}`}>
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 px-4">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No team members found" : "No team members"}
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm
                  ? "Try adjusting your search to find what you're looking for."
                  : "Start building your team by adding your first team member."}
              </p>
              {!searchTerm && isAdminRole(currentUserRole) && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Your First Team Member
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddTeamMemberDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={fetchTeamMembers}
      />

      <EditTeamMemberDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedMember(null);
        }}
        onSuccess={fetchTeamMembers}
        teamMember={selectedMember}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
