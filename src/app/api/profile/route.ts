import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import bcrypt from "bcryptjs";

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const userId = parseInt((session as { user: { id: string } }).user.id);

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
        avatar: true,
        timezone: true,
        website: true,
        active: true,
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
      return errorResponse("User not found", 404);
    }

    const profile = {
      ...user,
      stats: {
        assignedLeads: user._count.assignedLeads,
        createdTasks: user._count.createdTasks,
        createdMeetings: user._count.createdMeetings,
        createdNotes: user._count.createdNotes,
      },
    };

    return successResponse(profile, "Profile fetched successfully");
  } catch (error) {
    console.error("Error fetching profile:", error);
    return errorResponse("Failed to fetch profile", 500);
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const userId = parseInt((session as { user: { id: string } }).user.id);
    const body = await request.json();

    const {
      name,
      email,
      phone,
      department,
      jobTitle,
      bio,
      timezone,
      website,
      currentPassword,
      newPassword,
    } = body;

    // Validate email uniqueness (excluding current user)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [{ email }, { id: { not: userId } }],
        },
      });

      if (existingUser) {
        return errorResponse("Email already exists", 400);
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (bio !== undefined) updateData.bio = bio;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (website !== undefined) updateData.website = website;

    // Handle password change
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return errorResponse("User not found", 404);
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return errorResponse("Current password is incorrect", 400);
      }

      if (newPassword.length < 6) {
        return errorResponse("New password must be at least 6 characters", 400);
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    // Update user
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
        avatar: true,
        timezone: true,
        website: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
