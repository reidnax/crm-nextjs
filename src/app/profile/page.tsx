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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Globe,
  Clock,
  Edit3,
  X,
  Shield,
  Users,
  CheckSquare,
  FileText,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import ProfileEditForm from "@/components/forms/profile-edit-form";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: number;
  username: string;
  name?: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  jobTitle?: string;
  bio?: string;
  avatar?: string;
  timezone?: string;
  website?: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    assignedLeads: number;
    createdTasks: number;
    createdMeetings: number;
    createdNotes: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const result = await response.json();
      setProfile(result.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
  }, [session, fetchProfile]);

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchProfile();
  };

  const getInitials = (name?: string, email?: string, username?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || username)?.charAt(0).toUpperCase() || "U";
  };

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
      case "admin-dev":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Using the utility function from lib/utils instead of local formatDate

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

  if (status === "loading" || loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Profile not found
          </h3>
          <p className="text-gray-500">
            Unable to load your profile information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account information and preferences
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="sm:w-auto">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <ProfileEditForm
          profile={profile}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="bg-blue-500 text-white text-xl">
                      {getInitials(
                        profile.name,
                        profile.email,
                        profile.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">
                  {profile.name || profile.username}
                </CardTitle>
                <CardDescription className="flex items-center justify-center gap-2">
                  <Badge
                    className={getRoleColor(profile.role)}
                    variant="secondary"
                  >
                    <span className="flex items-center gap-1">
                      {getRoleIcon(profile.role)}
                      {profile.role}
                    </span>
                  </Badge>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>

                  {profile.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{profile.phone}</span>
                    </div>
                  )}

                  {profile.department && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{profile.department}</span>
                    </div>
                  )}

                  {profile.jobTitle && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span>{profile.jobTitle}</span>
                    </div>
                  )}

                  {profile.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Joined {formatDate(profile.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      Last login: {formatLastLogin(profile.lastLoginAt)}
                    </span>
                  </div>
                </div>

                {profile.bio && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Bio
                      </h4>
                      <p className="text-sm text-gray-600">{profile.bio}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Leads</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {profile.stats.assignedLeads}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tasks</p>
                      <p className="text-2xl font-bold text-green-600">
                        {profile.stats.createdTasks}
                      </p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Meetings
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {profile.stats.createdMeetings}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Notes</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {profile.stats.createdNotes}
                      </p>
                    </div>
                    <div className="bg-orange-100 p-2 rounded-full">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your account details and system information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {profile.username}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Account Status
                    </label>
                    <div className="mt-1">
                      <Badge variant={profile.active ? "default" : "secondary"}>
                        {profile.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {profile.timezone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {profile.timezone}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(profile.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Summary
                </CardTitle>
                <CardDescription>
                  Your contribution to the CRM system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium">
                        Assigned Leads
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {profile.stats.assignedLeads} leads
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-full">
                        <CheckSquare className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium">Tasks Created</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {profile.stats.createdTasks} tasks
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium">
                        Meetings Scheduled
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {profile.stats.createdMeetings} meetings
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="text-sm font-medium">Notes Written</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {profile.stats.createdNotes} notes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
