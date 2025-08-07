"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { isAdminRole } from "@/lib/permissions";

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
}

interface TeamMemberFormData {
  username: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: string;
  department: string;
  jobTitle: string;
  bio: string;
  active: boolean;
}

interface EditTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamMember: TeamMember | null;
  currentUserRole?: string;
}

const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Management",
  "Customer Support",
  "IT",
  "HR",
  "Finance",
  "Operations",
];

const ROLES = [
  { value: "Admin", label: "Administrator" },
  { value: "Admin-Dev", label: "Admin Developer" },
  { value: "Manager", label: "Manager" },
  { value: "Assignee", label: "Assignee" },
];

export default function EditTeamMemberDialog({
  isOpen,
  onClose,
  onSuccess,
  teamMember,
  currentUserRole = "user",
}: EditTeamMemberDialogProps) {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    username: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "Assignee",
    department: "",
    jobTitle: "",
    bio: "",
    active: true,
  });

  const [errors, setErrors] = useState<Partial<TeamMemberFormData>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Initialize form data when teamMember changes
  useEffect(() => {
    if (teamMember) {
      setFormData({
        username: teamMember.username || "",
        email: teamMember.email || "",
        password: "", // Don't populate password for security
        name: teamMember.name || "",
        phone: teamMember.phone || "",
        role: teamMember.role || "user",
        department: teamMember.department || "",
        jobTitle: teamMember.jobTitle || "",
        bio: teamMember.bio || "",
        active: teamMember.active,
      });
    }
  }, [teamMember]);

  const validateForm = (): boolean => {
    const newErrors: Partial<TeamMemberFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (
      formData.phone &&
      !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !teamMember) {
      return;
    }

    setLoading(true);

    try {
      // Prepare update data (exclude password if empty)
      const updateData = { ...formData };
      if (!updateData.password) {
        delete (updateData as any).password;
      }

      const response = await fetch(`/api/team/${teamMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update team member");
      }

      toast.success("Team member updated successfully!");
      onSuccess();
      handleClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(errorMessage);
      setErrors({
        username: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setShowPassword(false);
    onClose();
  };

  const handleInputChange = (
    field: keyof TeamMemberFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field as keyof Partial<TeamMemberFormData>]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const isAdmin = isAdminRole(currentUserRole);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update team member information. Leave password blank to keep current
            password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username and Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password (leave blank to keep current)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (optional)"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Full Name and Phone Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Role and Department Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-xs text-gray-500">
                  Only administrators can change roles
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  handleInputChange("department", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              type="text"
              placeholder="Enter job title"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Enter a short biography (optional)"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              rows={3}
            />
          </div>

          {/* Active Status - only for admins */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  handleInputChange("active", checked)
                }
              />
              <Label htmlFor="active">Active (user can log in)</Label>
            </div>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Team Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
