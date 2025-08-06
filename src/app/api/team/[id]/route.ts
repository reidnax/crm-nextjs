import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isAdmin, isAdminRole } from "@/lib/permissions";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import bcrypt from "bcryptjs";

// Helper function to check if user can edit a team member
async function canEditTeamMember(
  currentUserId: number,
  targetUserId: number
): Promise<boolean> {
  // Users can always edit themselves
  if (currentUserId === targetUserId) {
    const hasOwnPermission = await PermissionManager.hasPermission(
      currentUserId,
      "users.update.own"
    );
    return hasOwnPermission;
  }

  // Check global user management permission
  const hasGlobalPermission = await PermissionManager.hasPermission(
    currentUserId,
    "users.update.all"
  );
  if (hasGlobalPermission) {
    return true;
  }

  // Check department-level permissions
  const hasDepartmentUserPermission = await PermissionManager.hasPermission(
    currentUserId,
    "users.update.department"
  );
  const hasTeamManagePermission = await PermissionManager.hasPermission(
    currentUserId,
    "team.manage.department"
  );

  if (hasDepartmentUserPermission || hasTeamManagePermission) {
    // Get both users' basic info
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true },
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      }),
    ]);

    if (!targetUser) {
      return false; // Target user doesn't exist
    }

    // For now, managers with department permissions can manage non-admin users
    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      // Managers can edit non-admin users
      return targetUser.role !== "Admin" && targetUser.role !== "Admin-Dev";
    }
  }

  return false;
}

// Helper function to check if user can view a team member
async function canViewTeamMember(
  currentUserId: number,
  targetUserId: number
): Promise<boolean> {
  // Users can always view themselves
  if (currentUserId === targetUserId) {
    const hasOwnPermission = await PermissionManager.hasPermission(
      currentUserId,
      "users.read.own"
    );
    return hasOwnPermission;
  }

  // Check global read permission
  const hasGlobalPermission = await PermissionManager.hasPermission(
    currentUserId,
    "users.read.all"
  );
  const hasTeamReadAllPermission = await PermissionManager.hasPermission(
    currentUserId,
    "team.read.all"
  );
  if (hasGlobalPermission || hasTeamReadAllPermission) {
    return true;
  }

  // Check department-level permissions
  const hasDepartmentUserPermission = await PermissionManager.hasPermission(
    currentUserId,
    "users.read.department"
  );
  const hasTeamReadDepartmentPermission = await PermissionManager.hasPermission(
    currentUserId,
    "team.read.department"
  );

  if (hasDepartmentUserPermission || hasTeamReadDepartmentPermission) {
    // Get both users' info for department comparison
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, role: true },
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      }),
    ]);

    if (!targetUser) {
      return false; // Target user doesn't exist
    }

    // For now, managers with department permissions can view non-admin users
    if (currentUser?.role === "Manager") {
      return targetUser.role !== "Admin" && targetUser.role !== "Admin-Dev";
    }
  }

  return false;
}

// GET /api/team/[id] - Get a specific team member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check if user can view this team member
    const canView = await canViewTeamMember(currentUserId, userId);
    if (!canView) {
      return errorResponse(
        "Forbidden: You don't have permission to view this team member",
        403
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        bio: true,
        active: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedLeads: true,
            createdTasks: true,
            createdMeetings: true,
            createdNotes: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("Team member not found", 404);
    }

    const teamMember = {
      ...user,
      assignedLeads: user._count.assignedLeads,
      completedTasks: user._count.createdTasks,
      scheduledMeetings: user._count.createdMeetings,
      totalNotes: user._count.createdNotes,
    };

    return successResponse(teamMember, "Team member fetched successfully");
  } catch (error) {
    console.error("Error fetching team member:", error);
    return errorResponse("Failed to fetch team member", 500);
  }
}

// PUT /api/team/[id] - Update a team member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check permissions to edit this user
    const canEdit = await canEditTeamMember(currentUserId, userId);
    if (!canEdit) {
      return errorResponse(
        "Forbidden: You don't have permission to edit this team member",
        403
      );
    }

    const body = await request.json();
    const {
      username,
      email,
      password,
      name,
      phone,
      role,
      department,
      jobTitle,
      bio,
      active,
    } = body;

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return errorResponse("Team member not found", 404);
    }

    // Check for username/email conflicts (excluding current user)
    if (username || email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
              ],
            },
          ],
        },
      });

      if (conflictUser) {
        return errorResponse(
          conflictUser.username === username
            ? "Username already exists"
            : "Email already exists",
          400
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (bio !== undefined) updateData.bio = bio;

    // Check if user can manage roles and active status
    const canManageRoles = await PermissionManager.hasPermission(
      currentUserId,
      "users.manage.roles"
    );
    const canManageUsers = await PermissionManager.hasPermission(
      currentUserId,
      "users.update.all"
    );

    if (canManageRoles || canManageUsers) {
      if (role !== undefined) updateData.role = role;
      if (active !== undefined) updateData.active = active;
    }

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        bio: true,
        active: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedLeads: true,
            createdTasks: true,
            createdMeetings: true,
          },
        },
      },
    });

    const teamMember = {
      ...updatedUser,
      assignedLeads: updatedUser._count.assignedLeads,
      completedTasks: updatedUser._count.createdTasks,
      scheduledMeetings: updatedUser._count.createdMeetings,
    };

    return successResponse(teamMember, "Team member updated successfully");
  } catch (error) {
    console.error("Error updating team member:", error);
    return errorResponse("Failed to update team member", 500);
  }
}

// DELETE /api/team/[id] - Delete a team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check if user has permission to delete/deactivate users
    const canDeleteUsers = await PermissionManager.hasPermission(
      currentUserId,
      "users.delete"
    );
    const canManageUsers = await PermissionManager.hasPermission(
      currentUserId,
      "users.update.all"
    );

    if (!canDeleteUsers && !canManageUsers) {
      return errorResponse(
        "Forbidden: You don't have permission to delete team members",
        403
      );
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return errorResponse("Cannot delete your own account", 400);
    }

    // Check if user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return errorResponse("Team member not found", 404);
    }

    // Instead of hard delete, deactivate the user to maintain data integrity
    await prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });

    return successResponse(null, "Team member deactivated successfully");
  } catch (error) {
    console.error("Error deleting team member:", error);
    return errorResponse("Failed to delete team member", 500);
  }
}
