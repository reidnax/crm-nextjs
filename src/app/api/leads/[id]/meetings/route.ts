import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// Helper function to check if user can access a specific lead (shared logic)
async function canAccessLead(
  userId: number,
  leadId: number,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  const hasGlobalPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.all` as any
  );
  if (hasGlobalPermission) return true;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, assign: true, createdBy: true },
  });
  if (!lead) return false;

  const hasAssignedPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.assigned` as any
  );
  if (
    hasAssignedPermission &&
    (lead.assign === userId || lead.createdBy === userId)
  ) {
    return true;
  }

  const hasDepartmentPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.department` as any
  );
  if (hasDepartmentPermission) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      return true;
    }
  }

  return false;
}

// POST /api/leads/[id]/meetings - Create a new meeting for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead
    const canAccessLeadForMeetings = await canAccessLead(
      userId,
      leadId,
      "read"
    );
    if (!canAccessLeadForMeetings) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

    // Check if user has permission to create meetings
    const canCreateMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.create"
    );
    if (!canCreateMeetings) {
      return errorResponse(
        "Forbidden: You don't have permission to create meetings",
        403
      );
    }

    const body = await request.json();
    const { subject, description, startTime, endTime, location, type } = body;

    // Validate required fields
    if (!subject || !startTime || !endTime) {
      return errorResponse(
        "Subject, start time, and end time are required",
        400
      );
    }

    // Validate that end time is after start time
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return errorResponse("End time must be after start time", 400);
    }

    // Calculate duration in minutes
    const duration = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Create the meeting
    const meetingData = {
      subject,
      description: description || "",
      duration,
      startTime: start,
      endTime: end,
      type: type || "Meeting",
      leadId,
      createdBy: userId,
      ...(location && { location }),
    };

    const meeting = await prisma.meeting.create({
      data: meetingData,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(meeting, "Meeting scheduled successfully");
  } catch (error) {
    console.error("Error creating meeting:", error);
    return errorResponse("Failed to schedule meeting", 500);
  }
}

// GET /api/leads/[id]/meetings - Get all meetings for a lead
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
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead
    const canAccessLeadForMeetings = await canAccessLead(
      userId,
      leadId,
      "read"
    );
    if (!canAccessLeadForMeetings) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

    // Check if user has permission to read meetings
    const hasReadAllMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.all"
    );
    const hasReadAssignedMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.assigned"
    );
    const hasReadDepartmentMeetings = await PermissionManager.hasPermission(
      userId,
      "meetings.read.department"
    );

    if (
      !hasReadAllMeetings &&
      !hasReadAssignedMeetings &&
      !hasReadDepartmentMeetings
    ) {
      return errorResponse(
        "Forbidden: You don't have permission to read meetings",
        403
      );
    }

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Apply meeting filtering based on permissions
    const meetingFilter: any = { leadId };

    if (!hasReadAllMeetings) {
      const permissionFilters = [];

      if (hasReadAssignedMeetings) {
        // Can read meetings created by them
        permissionFilters.push({ createdBy: userId });
      }

      if (hasReadDepartmentMeetings) {
        // For now, managers can read all meetings in accessible leads
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
          // Managers can read all meetings for leads they can access
          permissionFilters.push({ leadId }); // This will allow all meetings for this lead
        }
      }

      if (permissionFilters.length > 0) {
        meetingFilter.OR = permissionFilters;
      } else {
        // No permission to read any meetings
        return successResponse([]);
      }
    }

    // Get meetings based on permission filtering
    const meetings = await prisma.meeting.findMany({
      where: meetingFilter,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return successResponse(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return errorResponse("Failed to fetch meetings", 500);
  }
}
