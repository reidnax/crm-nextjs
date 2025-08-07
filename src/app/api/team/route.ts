import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import bcrypt from "bcryptjs";

// GET /api/team - Fetch all team members
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check if user has permission to read team data
    const canReadAllTeam = await PermissionManager.hasPermission(
      currentUserId,
      "team.read.all"
    );
    const canReadDepartmentTeam = await PermissionManager.hasPermission(
      currentUserId,
      "team.read.department"
    );

    if (!canReadAllTeam && !canReadDepartmentTeam) {
      return errorResponse(
        "Forbidden: You don't have permission to view team members",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    // Build filter conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = department;
    }

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    // Apply permission-based filtering with proper resource management
    if (!canReadAllTeam) {
      if (canReadDepartmentTeam) {
        // Get current user info
        const currentUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, role: true },
        });

        if (currentUser?.role === "Manager") {
          // Managers can see department team members (excluding admins)
          where.role = { notIn: ["Admin", "Admin-Dev"] };
        } else {
          // Users with only department permissions but not managers get limited access
          return successResponse([]);
        }
      } else {
        // Check if user can only read their own data
        const hasOwnPermission = await PermissionManager.hasPermission(
          currentUserId,
          "users.read.own"
        );

        if (hasOwnPermission) {
          // Assignees can only see their own profile
          where.id = currentUserId;
        } else {
          // No permissions to read any team data
          return errorResponse(
            "Forbidden: You don't have permission to view team members",
            403
          );
        }
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        active: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignedLeads: true,
            createdTasks: true,
            createdMeetings: true,
          },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }, { username: "asc" }],
    });

    // Transform the data to include statistics
    const teamMembers = users.map((user) => ({
      ...user,
      assignedLeads: user._count.assignedLeads,
      completedTasks: user._count.createdTasks,
      scheduledMeetings: user._count.createdMeetings,
    }));

    return successResponse(teamMembers, "Team members fetched successfully");
  } catch (error) {
    console.error("Error fetching team members:", error);
    return errorResponse("Failed to fetch team members", 500);
  }
}

// POST /api/team - Create a new team member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check if user has permission to create users
    const canCreateUsers = await PermissionManager.hasPermission(
      currentUserId,
      "users.create"
    );

    if (!canCreateUsers) {
      return errorResponse(
        "Forbidden: You don't have permission to create team members",
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
      role = "user",

      jobTitle,
      bio,
      active = true,
    } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return errorResponse("Username, email, and password are required", 400);
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return errorResponse(
        existingUser.username === username
          ? "Username already exists"
          : "Email already exists",
        400
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        phone,
        role,

        jobTitle,
        bio,
        active,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        active: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
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
      ...newUser,
      assignedLeads: newUser._count.assignedLeads,
      completedTasks: newUser._count.createdTasks,
      scheduledMeetings: newUser._count.createdMeetings,
    };

    return successResponse(teamMember, "Team member created successfully");
  } catch (error) {
    console.error("Error creating team member:", error);
    return errorResponse("Failed to create team member", 500);
  }
}
